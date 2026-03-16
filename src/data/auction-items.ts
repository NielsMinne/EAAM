export type AuctionItem = {
  slug: string;
  title: string;
  label: string;
  image: string;
  currentBid: string;
  minimumIncrement: string;
  closesIn: string;
  location: string;
  description: string;
  highlights: string[];
  includes: string[];
};

export const auctionItems: Record<string, AuctionItem> = {
  "vacation-stay-for-2": {
    slug: "vacation-stay-for-2",
    title: "Luxury Vacation Stay for 2",
    label: "Featured lot",
    image: "/images/paira-daiza.webp",
    currentBid: "EUR 1,250",
    minimumIncrement: "EUR 25",
    closesIn: "6h 42m",
    location: "Amalfi Coast, Italy",
    description:
      "Escape to a boutique cliffside retreat with three nights in a panoramic suite, daily breakfast, and a private sunset boat tour included.",
    highlights: [
      "3 nights in a sea-view junior suite",
      "Sunset private boat experience",
      "Breakfast and airport pickup included"
    ],
    includes: [
      "Flexible travel window in 2026",
      "Valid for two adults",
      "No blackout dates in September"
    ]
  }
};
