import { Request, Response } from "express";
import { auctionItems } from "../data/auction-items";

export const renderWelcome = (_req: Request, res: Response): void => {
  res.render("welcome", { title: "EAAM - Welkom" });
};

export const renderRegister = (_req: Request, res: Response): void => {
  res.render("register", { title: "EAAM - Register" });
};

export const renderHome = (_req: Request, res: Response): void => {
  res.render("index", { title: "EAAM - Home" });
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
