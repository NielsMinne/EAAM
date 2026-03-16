import { adminBids, AdminBid } from "../data/admin-bids";

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

export const getAdminDashboardData = (rawPage: string | undefined): AdminDashboardData => {
  const pageSize = 10;
  const parsedPage = Number.parseInt(rawPage || "1", 10);
  const totalPages = Math.max(1, Math.ceil(adminBids.length / pageSize));
  const currentPage = Number.isNaN(parsedPage)
    ? 1
    : Math.min(Math.max(parsedPage, 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pagedBids = adminBids.slice(startIndex, endIndex);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);
  const bidsPerDay = getBidsPerDay(adminBids);

  return {
    bids: pagedBids.map((bid) => ({
      ...bid,
      addedAmountFormatted: formatEuro(bid.addedAmount)
    })),
    chartLabels: Array.from(bidsPerDay.keys()),
    chartValues: Array.from(bidsPerDay.values()),
    currentPage,
    totalPages,
    totalBids: adminBids.length,
    pageStart: adminBids.length === 0 ? 0 : startIndex + 1,
    pageEnd: Math.min(endIndex, adminBids.length),
    hasPrevPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
    prevPage: Math.max(currentPage - 1, 1),
    nextPage: Math.min(currentPage + 1, totalPages),
    pageNumbers
  };
};
