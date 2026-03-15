import express, { Request, Response, Router } from "express";

const router: Router = express.Router();

// Homepagina
router.get("/", (req: Request, res: Response): void => {
  res.render("index", { title: "Quiz" });
});


export default router;