import { Request, Response } from "express";
import { getBidderRegistration, hasBidderRegistration } from "../services/bidder-auth-service";
import { getCurrentBidState, placeBidForBidderRegistration } from "../services/bidding-service";

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

  let lastHighestBid = -1;
  let lastIsCurrentHighestBidder: boolean | null = null;
  const bidderRegistration = getBidderRegistration(req);

  const pushHighestBid = async (): Promise<void> => {
    try {
      const bidState = await getCurrentBidState(bidderRegistration);
      if (
        bidState.currentHighestBid === lastHighestBid &&
        bidState.isCurrentHighestBidder === lastIsCurrentHighestBidder
      ) {
        return;
      }

      lastHighestBid = bidState.currentHighestBid;
      lastIsCurrentHighestBidder = bidState.isCurrentHighestBidder;
      res.write(`event: highestBid\ndata: ${JSON.stringify(bidState)}\n\n`);
    } catch (error) {
      console.error("Failed to stream highest bid:", error);
    }
  };

  await pushHighestBid();

  const streamInterval = setInterval(() => {
    void pushHighestBid();
  }, 2000);

  const heartbeatInterval = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(streamInterval);
    clearInterval(heartbeatInterval);
  });
};
