// Normalized shapes every ingestion provider must produce (ADR-0001).
// SimpleFIN would implement the same interface later.

export type AccountType =
  | "checking"
  | "savings"
  | "credit"
  | "loan"
  | "brokerage";

export type NormalizedAccount = {
  externalAccountId: string;
  name: string;
  type: AccountType;
  mask?: string;
  currentBalance: number;
  availableBalance?: number;
  isBalanceOnly: boolean;
};

export type NormalizedTransaction = {
  externalTransactionId: string;
  externalAccountId: string;
  date: string;
  description: string;
  amount: number;
  pending: boolean;
  isTransfer: boolean;
  plaidCategoryPrimary?: string;
};

export type ExchangeResult = {
  accessToken: string;
  externalItemId: string;
  institutionName: string;
  accounts: NormalizedAccount[];
};

export type SyncPage = {
  added: NormalizedTransaction[];
  modified: NormalizedTransaction[];
  removedIds: string[];
  accounts: NormalizedAccount[];
  nextCursor: string;
  hasMore: boolean;
};

export interface IngestionAdapter {
  createLinkToken(userId: string): Promise<string>;
  exchangePublicToken(publicToken: string): Promise<ExchangeResult>;
  syncPage(accessToken: string, cursor?: string): Promise<SyncPage>;
}
