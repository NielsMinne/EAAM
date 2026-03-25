import { Request, Response } from "express";
import { getBidderRegistration, hasBidderRegistration } from "../services/bidder-auth-service";
import {
  CurrentBidSnapshot,
  getCurrentBidSnapshot,
  getCurrentBidState,
  placeBidForBidderRegistration,
  subscribeToBidChanges
} from "../services/bidding-service";

type BidStreamClient = {
  id: number;
  email: string | null;
  lastHighestBid: number;
  lastIsCurrentHighestBidder: boolean | null;
  res: Response;
};

const bidStreamClients: Map<number, BidStreamClient> = new Map();
let bidStreamClientId = 0;
let bidChangeUnsubscribe: (() => void) | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

const parseAmount = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value) : NaN;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? NaN : parsed;
  }

  return NaN;
};

const normalizeEmail = (email?: string | null): string | null => {
  if (typeof email !== "string") {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  return normalizedEmail || null;
};

const buildBidStateForClient = (snapshot: CurrentBidSnapshot, email: string | null) => {
  return {
    currentHighestBid: snapshot.currentHighestBid,
    isCurrentHighestBidder: Boolean(email && snapshot.latestBidderEmail && email === snapshot.latestBidderEmail)
  };
};

const pushBidStateToClient = (client: BidStreamClient, snapshot: CurrentBidSnapshot): void => {
  const bidState = buildBidStateForClient(snapshot, client.email);

  if (
    bidState.currentHighestBid === client.lastHighestBid &&
    bidState.isCurrentHighestBidder === client.lastIsCurrentHighestBidder
  ) {
    return;
  }

  client.lastHighestBid = bidState.currentHighestBid;
  client.lastIsCurrentHighestBidder = bidState.isCurrentHighestBidder;
  client.res.write(`event: highestBid\ndata: ${JSON.stringify(bidState)}\n\n`);
};

const broadcastBidStateToClients = async (): Promise<void> => {
  if (bidStreamClients.size === 0) {
    return;
  }

  try {
    const snapshot = await getCurrentBidSnapshot();
    bidStreamClients.forEach((client) => {
      pushBidStateToClient(client, snapshot);
    });
  } catch (error) {
    console.error("Failed to broadcast highest bid:", error);
  }
};

const startBidStreamRealtimeIfNeeded = (): void => {
  if (!bidChangeUnsubscribe) {
    bidChangeUnsubscribe = subscribeToBidChanges(() => {
      void broadcastBidStateToClients();
    });
  }

  if (!heartbeatInterval) {
    heartbeatInterval = setInterval(() => {
      bidStreamClients.forEach((client) => {
        client.res.write(": heartbeat\n\n");
      });
    }, 15000);
  }
};

const stopBidStreamRealtime = (): void => {
  if (bidChangeUnsubscribe) {
    bidChangeUnsubscribe();
    bidChangeUnsubscribe = null;
  }

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};

export const handleGetCurrentHighestBid = async (req: Request, res: Response): Promise<void> => {
  try {
    const bidderRegistration = getBidderRegistration(req);
    const bidState = await getCurrentBidState(bidderRegistration);
    res.status(200).json({ success: true, ...bidState });
  } catch (error) {
    console.error("Failed to get current highest bid:", error);
    res.status(500).json({ success: false, message: "Could not load current highest bid." });
  }
};

export const handlePlaceBid = async (req: Request, res: Response): Promise<void> => {
  const bidderRegistration = getBidderRegistration(req);
  if (!bidderRegistration?.email) {
    res.status(401).json({ success: false, message: "Please register first." });
    return;
  }

  const amount = parseAmount(req.body?.amount);
  if (!Number.isInteger(amount) || amount <= 0) {
    res.status(400).json({ success: false, message: "Please provide a valid bid amount." });
    return;
  }

  try {
    const bidState = await placeBidForBidderRegistration(bidderRegistration, amount);
    res.status(200).json({ success: true, ...bidState });
  } catch (error) {
    console.error("Failed to place bid:", error);
    res.status(500).json({ success: false, message: "Could not place bid right now." });
  }
};

export const handleBidStream = async (req: Request, res: Response): Promise<void> => {
  if (!hasBidderRegistration(req)) {
    res.status(401).end();
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const bidderRegistration = getBidderRegistration(req);
  const clientId = ++bidStreamClientId;
  const client: BidStreamClient = {
    id: clientId,
    email: normalizeEmail(bidderRegistration?.email),
    lastHighestBid: -1,
    lastIsCurrentHighestBidder: null,
    res
  };

  bidStreamClients.set(clientId, client);
  startBidStreamRealtimeIfNeeded();

  try {
    const snapshot = await getCurrentBidSnapshot();
    pushBidStateToClient(client, snapshot);
  } catch (error) {
    console.error("Failed to stream initial highest bid:", error);
  }

  req.on("close", () => {
    bidStreamClients.delete(clientId);

    if (bidStreamClients.size === 0) {
      stopBidStreamRealtime();
    }
  });
};
