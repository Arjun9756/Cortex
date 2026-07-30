import { Router } from "express";
import { getDashboardOverview , getPeoplePage , getBusFactorPage , getTechnologiesPage
    , getTimeline
} from "./controller.js";

export const router = Router()

router.get("/overview", getDashboardOverview);
router.get("/people", getPeoplePage);
router.get("/bus-factor", getBusFactorPage);
router.get("/technologies", getTechnologiesPage);
router.get("/timeline", getTimeline)