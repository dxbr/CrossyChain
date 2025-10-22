import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getNativeBalance, getIncomingTokenTransfers, getTokenBalances } from "./envio";
import type { Address } from "viem";

export async function registerRoutes(app: Express): Promise<Server> {
  // Envio HyperSync API routes for wallet data
  
  // Get native MON balance for an address
  app.get("/api/balance/:address", async (req, res) => {
    try {
      const { address } = req.params;
      const balance = await getNativeBalance(address as Address);
      res.json(balance);
    } catch (error: any) {
      console.error("Error fetching balance:", error);
      res.status(500).json({ error: error.message || "Failed to fetch balance" });
    }
  });

  // Get incoming token transfers for an address
  app.get("/api/transfers/:address", async (req, res) => {
    try {
      const { address } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const transfers = await getIncomingTokenTransfers(address as Address, limit);
      res.json(transfers);
    } catch (error: any) {
      console.error("Error fetching transfers:", error);
      res.status(500).json({ error: error.message || "Failed to fetch transfers" });
    }
  });

  // Get all token balances for an address
  app.get("/api/token-balances/:address", async (req, res) => {
    try {
      const { address } = req.params;
      const balances = await getTokenBalances(address as Address);
      res.json(balances);
    } catch (error: any) {
      console.error("Error fetching token balances:", error);
      res.status(500).json({ error: error.message || "Failed to fetch token balances" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
