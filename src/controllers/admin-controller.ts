import { Request, Response } from "express";
import { hasAdminAuth, isValidAdminPassword, setAdminAuthCookie } from "../services/auth-service";
import { getAdminDashboardData } from "../services/admin-bid-service";

export const renderAdminDashboardOrLogin = (req: Request, res: Response): void => {
  if (!hasAdminAuth(req)) {
    res.render("admin-login", {
      title: "EAAM - Admin Login",
      error: ""
    });
    return;
  }

  const rawPage = typeof req.query.page === "string" ? req.query.page : undefined;
  const dashboardData = getAdminDashboardData(rawPage);

  res.render("admin", {
    title: "EAAM - Admin Dashboard",
    ...dashboardData
  });
};

export const handleAdminLogin = (req: Request, res: Response): void => {
  const body = req.body as { password?: string };
  const password = typeof body.password === "string" ? body.password : "";

  if (!isValidAdminPassword(password)) {
    res.status(401).render("admin-login", {
      title: "EAAM - Admin Login",
      error: "Incorrect password. Try again."
    });
    return;
  }

  setAdminAuthCookie(res);
  res.redirect("/admin");
};
