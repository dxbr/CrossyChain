import { z } from "zod";

export const walletStateSchema = z.object({
  address: z.string().optional(),
  smartAccountAddress: z.string().optional(),
  isConnected: z.boolean(),
  isConnecting: z.boolean(),
  chainId: z.number().optional(),
});

export const transactionStatusSchema = z.enum([
  "idle",
  "pending",
  "success",
  "failed",
]);

export const transactionMethodSchema = z.enum(["smartAccount", "eoa"]);

export const transactionDataSchema = z.object({
  hash: z.string().optional(),
  status: transactionStatusSchema,
  error: z.string().optional(),
  explorerUrl: z.string().optional(),
  method: transactionMethodSchema.optional(),
  progressMessage: z.string().optional(),
  secondsElapsed: z.number().optional(),
});

export const scoreDataSchema = z.object({
  score: z.number(),
  playerAddress: z.string(),
  timestamp: z.number(),
  transactionHash: z.string().optional(),
});

export type WalletState = z.infer<typeof walletStateSchema>;
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;
export type TransactionMethod = z.infer<typeof transactionMethodSchema>;
export type TransactionData = z.infer<typeof transactionDataSchema>;
export type ScoreData = z.infer<typeof scoreDataSchema>;
