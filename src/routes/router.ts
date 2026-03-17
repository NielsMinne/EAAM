import { Router } from "express";
import { handleAdminLogin, renderAdminDashboardOrLogin } from "../controllers/admin-controller";
import { handleBidStream, handleGetCurrentHighestBid, handlePlaceBid } from "../controllers/bid-controller";
import { renderHome, renderItemDetail, renderRegister, renderWelcome } from "../controllers/page-controller";
import { handleRegister } from "../controllers/register-controller";

const router: Router = Router();

router.get("/", renderWelcome);
router.get("/register", renderRegister);
router.post("/api/register", handleRegister);
router.get("/api/bids/current", handleGetCurrentHighestBid);
router.get("/api/bids/stream", handleBidStream);
router.post("/api/bids", handlePlaceBid);
router.get("/home", renderHome);
router.get("/items/:slug", renderItemDetail);
router.get("/admin", renderAdminDashboardOrLogin);
router.post("/admin/login", handleAdminLogin);

export default router;