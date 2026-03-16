import { Router } from "express";
import { handleAdminLogin, renderAdminDashboardOrLogin } from "../controllers/admin-controller";
import { renderHome, renderItemDetail, renderRegister, renderWelcome } from "../controllers/page-controller";

const router: Router = Router();

router.get("/", renderWelcome);
router.get("/register", renderRegister);
router.get("/home", renderHome);
router.get("/items/:slug", renderItemDetail);
router.get("/admin", renderAdminDashboardOrLogin);
router.post("/admin/login", handleAdminLogin);

export default router;