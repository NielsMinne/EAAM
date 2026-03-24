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
  impactTitle: string;
  impactCopy: string;
  impactPoints: string[];
  highlights: string[];
  includes: string[];
};

export const auctionItems: Record<string, AuctionItem> = {
  "tapir-plush": {
    slug: "tapir-plush",
    title: "Marty The Tapir",
    label: "Charity prize",
    image: "/images/tapir.png",
    currentBid: "EUR 75",
    minimumIncrement: "EUR 5",
    closesIn: "6h 42m",
    location: "EAAM Charity Auction",
    description:
      "Bid to win Marty The Tapir, an adorable plush. This EAAM auction item is dedicated to the welfare and long-term conservation of marine mammals.",
    impactTitle: "How your bid helps marine mammals",
    impactCopy:
      "Net proceeds from this plush directly support EAAM conservation work for dolphins, porpoises, seals and other aquatic mammals in professional care and in the wild.",
    impactPoints: [
      "Supports veterinary care, rescue readiness and welfare programs in EAAM member parks",
      "Funds education and outreach on marine mammal habitats, threats and conservation measures",
      "Helps share scientific and medical knowledge across the EAAM network"
    ],
    highlights: [
     
    ],
    includes: [
      "One tapir plush",
      "Pickup right after auction close"
    ]
  }
};
