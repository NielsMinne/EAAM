import { Request, Response } from "express";
import { auctionItems } from "../data/auction-items";
import { getBidderRegistration, hasBidderRegistration } from "../services/bidder-auth-service";
import { getCurrentBidState } from "../services/bidding-service";

const formatEuro = (value: number): string =>
  new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(value);

export const renderWelcome = (_req: Request, res: Response): void => {
  res.render("welcome", { title: "EAAM - Welkom" });
};

export const renderRegister = (_req: Request, res: Response): void => {
  res.render("register", { title: "EAAM - Register" });
};

export const renderHome = async (req: Request, res: Response): Promise<void> => {
  if (!hasBidderRegistration(req)) {
    res.redirect("/");
    return;
  }

  try {
    const bidderRegistration = getBidderRegistration(req);
    const bidState = await getCurrentBidState(bidderRegistration);

    res.render("index", {
      title: "EAAM - Home",
      currentHighestBid: formatEuro(bidState.currentHighestBid),
      isCurrentHighestBidder: bidState.isCurrentHighestBidder
    });
  } catch (error) {
    console.error("Failed to load highest bid:", error);

    res.render("index", {
      title: "EAAM - Home",
      currentHighestBid: formatEuro(100),
      isCurrentHighestBidder: false
    });
  }
};

export const renderItemDetail = (req: Request, res: Response): void => {
  const { slug } = req.params;
  const item = auctionItems[slug as string];

  if (!item) {
    res.status(404).render("index", { title: "EAAM - Home" });
    return;
  }

  res.render("item", {
    title: `EAAM - ${item.title}`,
    item
  });
};
