import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

type AdminBid = {
  day: string;
  bidder: string;
  addedAmount: number;
  time: string;
};

type AdminBidView = AdminBid & {
  addedAmountFormatted: string;
};

export type AdminDashboardData = {
  bids: AdminBidView[];
  chartLabels: string[];
  chartValues: number[];
  currentPage: number;
  totalPages: number;
  totalBids: number;
  pageStart: number;
  pageEnd: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number;
  nextPage: number;
  pageNumbers: number[];
};

let supabaseClient: SupabaseClient | null = null;

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

const formatEuro = (value: number): string =>
  new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(value);

const getBidsPerDay = (bids: AdminBid[]): Map<string, number> => {
  const bidsPerDay = new Map<string, number>();
  for (const bid of bids) {
    bidsPerDay.set(bid.day, (bidsPerDay.get(bid.day) || 0) + 1);
  }

  return bidsPerDay;
};

const formatDateToDayNumeral = (date: Date): string => {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return daysOfWeek[date.getDay()];
};

const formatDateToTimeString = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const getAllBidsFromDatabase = async (): Promise<AdminBid[]> => {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("biddings")
    .select("amount, created_at, bidder_id, bidders(first_name, last_name)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data
    .map((bid: any) => {
      const createdAt = new Date(bid.created_at);
      const bidderName = bid.bidders
        ? `${bid.bidders.first_name} ${bid.bidders.last_name}`.trim()
        : "Unknown";

      const amount = typeof bid.amount === "number" ? bid.amount : Number(bid.amount) || 0;

      return {
        day: formatDateToDayNumeral(createdAt),
        time: formatDateToTimeString(createdAt),
        bidder: bidderName,
        addedAmount: amount
      };
    });
};

export const getAdminDashboardData = async (rawPage: string | undefined): Promise<AdminDashboardData> => {
  const pageSize = 6;
  const parsedPage = Number.parseInt(rawPage || "1", 10);

  let allBids: AdminBid[] = [];
  try {
    allBids = await getAllBidsFromDatabase();
  } catch (error) {
    console.error("Error fetching bids from database:", error);
    allBids = [];
  }

  const totalPages = Math.max(1, Math.ceil(allBids.length / pageSize));
  const currentPage = Number.isNaN(parsedPage)
    ? 1
    : Math.min(Math.max(parsedPage, 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pagedBids = allBids.slice(startIndex, endIndex);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);
  const bidsPerDay = getBidsPerDay(allBids);

  return {
    bids: pagedBids.map((bid) => ({
      ...bid,
      addedAmountFormatted: formatEuro(bid.addedAmount)
    })),
    chartLabels: Array.from(bidsPerDay.keys()),
    chartValues: Array.from(bidsPerDay.values()),
    currentPage,
    totalPages,
    totalBids: allBids.length,
    pageStart: allBids.length === 0 ? 0 : startIndex + 1,
    pageEnd: Math.min(endIndex, allBids.length),
    hasPrevPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
    prevPage: Math.max(currentPage - 1, 1),
    nextPage: Math.min(currentPage + 1, totalPages),
    pageNumbers
  };
};
