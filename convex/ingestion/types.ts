// Provider-agnostic shapes for bank ingestion (ADR-0001).
//
// Everything downstream (Convex storage, sync, dashboard) speaks these types —
// never Plaid's raw API shapes. That way a future SimpleFIN adapter can plug
// in by implementing IngestionAdapter without rewriting the rest of the app.

export type AccountType =
  | "checking"
  | "savings"
  | "credit"
  | "loan"
  | "brokerage";

export type NormalizedAccount = {
  /** Provider's account id (Plaid account_id). Used for upserts. */
  externalAccountId: string;
  name: string;
  type: AccountType;
  mask?: string;
  currentBalance: number;
  availableBalance?: number;
  /** Brokerage/IRA/401k: show balance only, skip transaction history (v1). */
  isBalanceOnly: boolean;
};

export type NormalizedTransaction = {
  /** Provider's transaction id. Same id across pending→posted updates. */
  externalTransactionId: string;
  externalAccountId: string;
  date: string; // YYYY-MM-DD
  description: string;
  /** Positive = money out, negative = money in (Plaid convention). */
  amount: number;
  pending: boolean;
  /** Credit-card payments / account transfers — excluded from budget spend. */
  isTransfer: boolean;
  /** Plaid's personal_finance_category.primary; mapped to our Category list. */
  plaidCategoryPrimary?: string;
};

/** Result of exchanging a Link public_token for a durable access_token. */
export type ExchangeResult = {
  accessToken: string;
  externalItemId: string;
  institutionName: string;
  accounts: NormalizedAccount[];
};

/**
 * One page of /transactions/sync.
 * Call repeatedly with nextCursor until hasMore is false.
 * accounts is usually empty on intermediate pages (balances fetched on the last page).
 */
export type SyncPage = {
  added: NormalizedTransaction[];
  modified: NormalizedTransaction[];
  removedIds: string[];
  accounts: NormalizedAccount[];
  nextCursor: string;
  hasMore: boolean;
};

/** The only surface the rest of Summit should call for bank data. */
export interface IngestionAdapter {
  createLinkToken(userId: string): Promise<string>;
  exchangePublicToken(publicToken: string): Promise<ExchangeResult>;
  syncPage(accessToken: string, cursor?: string): Promise<SyncPage>;
}
