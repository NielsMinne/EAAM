import express, { Request, Response, Router } from "express";

const router: Router = express.Router();

// Welcome/loading page -> naar register of home
router.get("/", (req: Request, res: Response): void => {
  res.render("welcome", { title: "EAAM - Welkom" });
});

// Register page
router.get("/register", (req: Request, res: Response): void => {
  res.render("register", { title: "EAAM - Register", bodyClass: "register-page" });
});

// Homepagina
router.get("/home", (req: Request, res: Response): void => {
  res.render("index", { title: "EAAM - Home", bodyClass: "home-page" });
});


export default router;