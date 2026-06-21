import { Router } from "express";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { canManageSettings } from "../lib/auth/permissions.js";
import {
  getCurrentMarketRates,
  getMarketRateHistory,
  MarketRateError,
  overrideMarketRates,
  refreshMarketRates,
} from "../lib/market-rates/service.js";
import type { OverrideMarketRatesInput } from "../types.js";

export const marketRatesRouter = Router();

marketRatesRouter.use(authenticate);

marketRatesRouter.get("/current", async (_req, res) => {
  try {
    const rates = await getCurrentMarketRates();
    res.json(rates);
  } catch (error) {
    console.error("GET /api/market-rates/current", error);
    res.status(500).json({ error: "Failed to fetch market rates" });
  }
});

marketRatesRouter.post(
  "/override",
  requireRole(canManageSettings),
  async (req: AuthenticatedRequest, res) => {
    try {
      const rates = await overrideMarketRates(
        req.body as OverrideMarketRatesInput,
      );
      res.json(rates);
    } catch (error) {
      if (error instanceof MarketRateError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/market-rates/override", error);
      res.status(500).json({ error: "Failed to override market rates" });
    }
  },
);

marketRatesRouter.post(
  "/refresh",
  requireRole(canManageSettings),
  async (_req, res) => {
    try {
      const rates = await refreshMarketRates();
      res.json(rates);
    } catch (error) {
      if (error instanceof MarketRateError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/market-rates/refresh", error);
      res.status(500).json({ error: "Failed to refresh market rates" });
    }
  },
);

marketRatesRouter.get(
  "/history",
  requireRole(canManageSettings),
  async (_req, res) => {
    try {
      const history = await getMarketRateHistory();
      res.json(history);
    } catch (error) {
      console.error("GET /api/market-rates/history", error);
      res.status(500).json({ error: "Failed to fetch rate history" });
    }
  },
);
