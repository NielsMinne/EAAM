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
  "tapir-plush": {
    slug: "tapir-plush",
    title: "Tapir Plush",
    label: "Charity prize",
    image: "/images/tapir.png",
    currentBid: "EUR 75",
    minimumIncrement: "EUR 5",
    closesIn: "6h 42m",
    location: "EAAM Charity Auction",
    description:
      "Bid to win an adorable tapir plush. Every euro raised goes to a good cause supporting animal care and conservation.",
    highlights: [
      "Soft and huggable tapir plush",
      "A sweet gift for wildlife lovers",
      "100% of proceeds go to a good cause"
    ],
    includes: [
      "One tapir plush",
      "Pickup right after auction close"
    ]
  }
};
