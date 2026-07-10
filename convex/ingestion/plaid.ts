// Plaid implementation of IngestionAdapter.
//
// This file is the only place that imports the `plaid` SDK. Everything else
// works against the normalized types in ./types so we can swap providers later.

import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
  type AccountBase,
  type Transaction,
} from "plaid";
import type {
  AccountType,
  ExchangeResult,
  IngestionAdapter,
  NormalizedAccount,
  NormalizedTransaction,
  SyncPage,
} from "./types";

function plaidClient(): PlaidApi {
  // These env vars live on the Convex deployment (npx convex env set ...),
  // not just in Next.js .env.local — actions run on Convex's servers.
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) {
    throw new Error("PLAID_CLIENT_ID and PLAID_SECRET must be set on deployment");
  }
  const env =
    process.env.PLAID_ENV === "production"
      ? PlaidEnvironments.production
      : PlaidEnvironments.sandbox;

  return new PlaidApi(
    new Configuration({
      basePath: env,
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": clientId,
          "PLAID-SECRET": secret,
        },
      },
    }),
  );
}

function mapAccountType(account: AccountBase): AccountType {
  // Collapse Plaid's richer taxonomy into our five Account types.
  // Loans and credit are liabilities (subtract from net worth).
  if (account.type === "credit") return "credit";
  if (account.type === "loan") return "loan";
  if (account.type === "investment") return "brokerage";
  if (account.subtype === "savings") return "savings";
  return "checking";
}

function normalizeAccount(account: AccountBase): NormalizedAccount {
  const type = mapAccountType(account);
  return {
    externalAccountId: account.account_id,
    name: account.name,
    type,
    mask: account.mask ?? undefined,
    currentBalance: account.balances.current ?? 0,
    availableBalance: account.balances.available ?? undefined,
    // Brokerage accounts are balance-only in v1 (CONTEXT.md).
    isBalanceOnly: type === "brokerage",
  };
}

function isTransfer(txn: Transaction): boolean {
  // Transfers between your own accounts (and credit-card payments) must not
  // count as spending — otherwise budgets double-count the same money.
  const primary = txn.personal_finance_category?.primary;
  const detailed = txn.personal_finance_category?.detailed;
  if (primary === "TRANSFER_IN" || primary === "TRANSFER_OUT") return true;
  if (detailed === "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT") return true;
  return false;
}

function normalizeTransaction(txn: Transaction): NormalizedTransaction {
  return {
    externalTransactionId: txn.transaction_id,
    externalAccountId: txn.account_id,
    date: txn.date,
    description: txn.name,
    // Plaid: positive = money out, negative = money in.
    amount: txn.amount,
    pending: txn.pending,
    isTransfer: isTransfer(txn),
    plaidCategoryPrimary: txn.personal_finance_category?.primary,
  };
}

export class PlaidAdapter implements IngestionAdapter {
  // Step 1 of Link: short-lived token the browser uses to open Plaid Link UI.
  async createLinkToken(userId: string): Promise<string> {
    const client = plaidClient();
    const response = await client.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: "Summit",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
      // How much history to pull on first sync (max 730; 90 is a good default).
      transactions: { days_requested: 90 },
    });
    return response.data.link_token;
  }

  // Step 2 of Link: trade the one-time public_token for a durable access_token.
  // The access_token is what we store and use for all future syncs.
  async exchangePublicToken(publicToken: string): Promise<ExchangeResult> {
    const client = plaidClient();
    const exchange = await client.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const accessToken = exchange.data.access_token;
    const externalItemId = exchange.data.item_id;

    const itemResponse = await client.itemGet({ access_token: accessToken });
    const institutionName =
      itemResponse.data.item.institution_name ?? "Unknown institution";

    const accountsResponse = await client.accountsGet({
      access_token: accessToken,
    });

    return {
      accessToken,
      externalItemId,
      institutionName,
      accounts: accountsResponse.data.accounts.map(normalizeAccount),
    };
  }

  // Incremental sync. Pass the previous nextCursor (or undefined for first run).
  // Plaid returns added / modified / removed deltas since that cursor.
  async syncPage(accessToken: string, cursor?: string): Promise<SyncPage> {
    const client = plaidClient();
    const response = await client.transactionsSync({
      access_token: accessToken,
      cursor: cursor ?? undefined,
      count: 500,
    });
    const data = response.data;

    // Balances only need one snapshot per sync run — fetch on the final page.
    const accounts = data.has_more
      ? []
      : (
          await client.accountsGet({ access_token: accessToken })
        ).data.accounts.map(normalizeAccount);

    return {
      added: data.added.map(normalizeTransaction),
      modified: data.modified.map(normalizeTransaction),
      // SDK types transaction_id as optional; drop undefined to satisfy Convex.
      removedIds: data.removed
        .map((r) => r.transaction_id)
        .filter((id): id is string => id !== undefined),
      accounts,
      nextCursor: data.next_cursor,
      hasMore: data.has_more,
    };
  }
}

export function createIngestionAdapter(): IngestionAdapter {
  // Single factory so callers never hard-code PlaidAdapter.
  // Swap the return value here when adding SimpleFIN.
  return new PlaidAdapter();
}
