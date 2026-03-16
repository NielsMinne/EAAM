export type AdminBid = {
  day: string;
  bidder: string;
  addedAmount: number;
  time: string;
};

export const adminBids: AdminBid[] = [
  { day: "Mon", bidder: "Olivia M.", addedAmount: 25, time: "18:10" },
  { day: "Mon", bidder: "Noah R.", addedAmount: 50, time: "18:14" },
  { day: "Tue", bidder: "Emma V.", addedAmount: 100, time: "18:19" },
  { day: "Tue", bidder: "Liam K.", addedAmount: 75, time: "18:26" },
  { day: "Wed", bidder: "Sofia B.", addedAmount: 75, time: "18:34" },
  { day: "Wed", bidder: "Mason T.", addedAmount: 75, time: "18:42" },
  { day: "Thu", bidder: "Ava D.", addedAmount: 100, time: "18:50" },
  { day: "Fri", bidder: "Lucas W.", addedAmount: 100, time: "18:57" }
];
