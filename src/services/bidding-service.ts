import { createClient, RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { BidderCookiePayload } from "./bidder-auth-service";
dotenv.config();

const STARTING_BID_AMOUNT = 50;

export interface CurrentBidState {
  currentHighestBid: number;
  isCurrentHighestBidder: boolean;
}

export interface CurrentBidSnapshot {
  currentHighestBid: number;
  latestBidderEmail: string | null;
}

type BidChangeListener = () => void;

let supabaseClient: SupabaseClient | null = null;
let bidChangesChannel: RealtimeChannel | null = null;
const bidChangeListeners: Set<BidChangeListener> = new Set();

const getSupabaseClient = (): SupabaseClient => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE key in environment variables.");
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }

  return supabaseClient;
};

const notifyBidChangeListeners = (): void => {
  bidChangeListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error("Bid change listener failed:", error);
    }
  });
};

const ensureBidChangesSubscription = (): void => {
  if (bidChangesChannel) {
    return;
  }

  const client = getSupabaseClient();

  bidChangesChannel = client
    .channel("eaam-biddings-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "biddings" },
      (payload) => {
        notifyBidChangeListeners();
        console.log("Received bid change event:", payload);
      }
    );

  bidChangesChannel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      console.log("Successfully subscribed to biddings changes!");
    }

    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      console.error("Supabase bid changes channel status:", status);
      
      // FIX: Clean up the dead channel so the next request attempts a fresh connection
      const client = getSupabaseClient();
      if (bidChangesChannel) {
        void client.removeChannel(bidChangesChannel);
      }
      bidChangesChannel = null; 
    }
  });
};

const getBiddingsSum = async (): Promise<number> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("biddings")
    .select("amount");

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return 0;
  }

  return data.reduce((sum, bid) => {
    const amount = typeof bid.amount === "number" ? bid.amount : Number(bid.amount) || 0;
    return sum + amount;
  }, 0);
};

const getLatestBidderEmail = async (): Promise<string | null> => {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("biddings")
    .select("bidder_id")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const bidderId = data[0].bidder_id;
  const normalizedBidderId = typeof bidderId === "string"
    ? bidderId.trim()
    : String(bidderId || "").trim();

  if (!normalizedBidderId) {
    return null;
  }

  const { data: bidderData, error: bidderError } = await client
    .from("bidders")
    .select("email")
    .eq("id", normalizedBidderId)
    .limit(1);

  if (bidderError) {
    throw bidderError;
  }

  if (!bidderData || bidderData.length === 0) {
    return null;
  }

  const email = bidderData[0].email;
  if (typeof email !== "string") {
    return null;
  }

  return email.trim().toLowerCase();
};

const getBidderIdByEmail = async (email: string): Promise<string | null> => {
  const client = getSupabaseClient();
  const normalizedEmail = email.trim().toLowerCase();

  const { data: exactData, error: exactError } = await client
    .from("bidders")
    .select("id,email")
    .eq("email", normalizedEmail)
    .limit(1);

  if (exactError) {
    throw exactError;
  }

  if (exactData && exactData.length > 0) {
    return exactData[0].id as string;
  }

  const { data, error } = await client
    .from("bidders")
    .select("id,email")
    .ilike("email", normalizedEmail)
    .limit(1);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const exactMatch = data.find((row) => {
    const rowEmail = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
    return rowEmail === normalizedEmail;
  });

  if (exactMatch) {
    return exactMatch.id as string;
  }

  return data[0].id as string;
};

const createBidder = async (registration: BidderCookiePayload): Promise<string> => {
  const client = getSupabaseClient();
  const normalizedFirstName = registration.firstName.trim();
  const normalizedLastName = registration.lastName.trim();
  const normalizedEmail = registration.email.trim().toLowerCase();

  const { data, error } = await client
    .from("bidders")
    .insert({
      first_name: normalizedFirstName,
      last_name: normalizedLastName,
      email: normalizedEmail
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const existingBidderId = await getBidderIdByEmail(normalizedEmail);
      if (existingBidderId) {
        return existingBidderId;
      }
    }

    throw error;
  }

  return data.id as string;
};

const getOrCreateBidderId = async (registration: BidderCookiePayload): Promise<string> => {
  const existingBidderId = await getBidderIdByEmail(registration.email);
  if (existingBidderId) {
    return existingBidderId;
  }

  return createBidder(registration);
};

export const getCurrentHighestBid = async (): Promise<number> => {
  const biddingsSum = await getBiddingsSum();
  return STARTING_BID_AMOUNT + biddingsSum;
};

export const getCurrentBidSnapshot = async (): Promise<CurrentBidSnapshot> => {
  const [currentHighestBid, latestBidderEmail] = await Promise.all([
    getCurrentHighestBid(),
    getLatestBidderEmail()
  ]);

  return {
    currentHighestBid,
    latestBidderEmail
  };
};

export const getCurrentBidState = async (registration?: BidderCookiePayload | null): Promise<CurrentBidState> => {
  const { currentHighestBid, latestBidderEmail } = await getCurrentBidSnapshot();

  if (!registration?.email || !latestBidderEmail) {
    return {
      currentHighestBid,
      isCurrentHighestBidder: false
    };
  }

  const cookieEmail = registration.email.trim().toLowerCase();

  return {
    currentHighestBid,
    isCurrentHighestBidder: cookieEmail === latestBidderEmail
  };
};

export const subscribeToBidChanges = (listener: BidChangeListener): (() => void) => {
  if (typeof listener !== "function") {
    return () => {};
  }

  bidChangeListeners.add(listener);
  ensureBidChangesSubscription();

  return () => {
    bidChangeListeners.delete(listener);

    if (bidChangeListeners.size === 0 && bidChangesChannel) {
      const client = getSupabaseClient();
      void client.removeChannel(bidChangesChannel);
      bidChangesChannel = null;
    }
  };
};

export const placeBidForBidderRegistration = async (
  registration: BidderCookiePayload,
  amount: number
): Promise<CurrentBidState> => {
  const client = getSupabaseClient();
  const bidderId = await getOrCreateBidderId(registration);

  const { error } = await client
    .from("biddings")
    .insert({
      bidder_id: bidderId,
      amount
    });

  if (error) {
    throw error;
  }

  // Ensure connected SSE clients update immediately for bids placed through this API.
  notifyBidChangeListeners();

  return getCurrentBidState(registration);
};
