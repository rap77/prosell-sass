/**
 * Zod schemas for the wallet endpoints.
 *
 * Validates the wire shape at the HTTP boundary instead of trusting the
 * generic `handleResponse<T>` cast on `response.json()`. `.passthrough()`
 * tolerates backend fields the wallet UI doesn't render yet (mirrors the
 * `leads.ts`/`appointments.ts` schema convention).
 */

import { z } from "zod";

export const TransactionTypeSchema = z.enum(["credit", "debit"]);

export const WalletTransactionSchema = z
  .object({
    id: z.string(),
    wallet_id: z.string(),
    tenant_id: z.string(),
    transaction_type: TransactionTypeSchema,
    amount: z.number(),
    balance_after: z.number(),
    description: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    created_at: z.string(),
  })
  .passthrough();

export const WalletSchema = z
  .object({
    id: z.string(),
    organization_id: z.string(),
    tenant_id: z.string(),
    balance: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export const WalletTransactionsResponseSchema = z.object({
  transactions: z.array(WalletTransactionSchema),
  total: z.number(),
  skip: z.number(),
  limit: z.number(),
});

export type TransactionType = z.infer<typeof TransactionTypeSchema>;
export type WalletTransaction = z.infer<typeof WalletTransactionSchema>;
export type Wallet = z.infer<typeof WalletSchema>;
export type WalletTransactionsResponse = z.infer<
  typeof WalletTransactionsResponseSchema
>;
