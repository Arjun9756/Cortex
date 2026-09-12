import { Router } from "express";
import {
    getDashboardOverview,
    getPeoplePage,
    getBusFactorPage,
    getTechnologiesPage,
    getTimeline,
    getFindings,
    simulateDeparture,
    getRepoDetails,
    getIntegrationsStatus,
    updateIntegrationSecret,
} from "./controller.js";

export const dashboardRouter = Router()

dashboardRouter.get("/overview", getDashboardOverview);
dashboardRouter.get("/people", getPeoplePage);
dashboardRouter.get("/bus-factor", getBusFactorPage);
dashboardRouter.get("/repos/:repoName/details", getRepoDetails);
dashboardRouter.get("/technologies", getTechnologiesPage);
dashboardRouter.get("/timeline", getTimeline);
dashboardRouter.get("/findings", getFindings);
dashboardRouter.get("/people/:externalId/simulate-departure", simulateDeparture);
dashboardRouter.get("/integrations/status", getIntegrationsStatus);
dashboardRouter.post("/:provider/secret", updateIntegrationSecret);