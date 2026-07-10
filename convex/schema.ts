import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Domain language lives in CONTEXT.md: Item -> Accounts -> Transactions,
// Categories with optional Budgets, Transfers excluded from spend math.
export default defineSchema({
  // Single-user auth: WebAuthn credentials + server-side sessions.
  passkeys: defineTable({
    credentialId: v.string(),
    publicKey: v.string(),
    counter: v.number(),
    transports: v.optional(v.array(v.string())),
  }).index("by_credential_id", ["credentialId"]),

  sessions: defineTable({
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

  items: defineTable({
    plaidItemId: v.string(),
    institutionName: v.string(),
    accessToken: v.string(),
    syncCursor: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("error")),
    errorMessage: v.optional(v.string()),
    lastSyncedAt: v.optional(v.number()),
  }).index("by_plaid_item_id", ["plaidItemId"]),

  accounts: defineTable({
    itemId: v.id("items"),
    plaidAccountId: v.string(),
    name: v.string(),
    type: v.union(
      v.literal("checking"),
      v.literal("savings"),
      v.literal("credit"),
      v.literal("loan"),
      v.literal("brokerage"),
    ),
    mask: v.optional(v.string()),
    currentBalance: v.number(),
    availableBalance: v.optional(v.number()),
    // Balance-only Accounts (e.g. Fidelity brokerage) have no Transactions.
    isBalanceOnly: v.boolean(),
  })
    .index("by_item", ["itemId"])
    .index("by_plaid_account_id", ["plaidAccountId"]),

  categories: defineTable({
    name: v.string(),
  }).index("by_name", ["name"]),

  // Maps Plaid personal_finance_category.primary → user Category.
  plaidCategoryMappings: defineTable({
    plaidPrimary: v.string(),
    categoryId: v.id("categories"),
  }).index("by_plaid_primary", ["plaidPrimary"]),

  transactions: defineTable({
    accountId: v.id("accounts"),
    plaidTransactionId: v.string(),
    date: v.string(), // YYYY-MM-DD
    description: v.string(),
    // Plaid convention: positive = money out, negative = money in.
    amount: v.number(),
    pending: v.boolean(),
    categoryId: v.optional(v.id("categories")),
    // Manual category overrides must survive re-syncs (ADR-0001).
    categoryOverridden: v.boolean(),
    isTransfer: v.boolean(),
  })
    .index("by_date", ["date"])
    .index("by_account_and_date", ["accountId", "date"])
    .index("by_plaid_transaction_id", ["plaidTransactionId"])
    .searchIndex("by_description", { searchField: "description" }),

  budgets: defineTable({
    categoryId: v.id("categories"),
    monthlyLimit: v.number(),
  }).index("by_category", ["categoryId"]),

  // One row per account per day; powers a future net-worth chart.
  balanceSnapshots: defineTable({
    accountId: v.id("accounts"),
    date: v.string(), // YYYY-MM-DD
    balance: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_account_and_date", ["accountId", "date"]),
});
