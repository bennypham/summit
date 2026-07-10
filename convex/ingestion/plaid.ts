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
  async createLinkToken(userId: string): Promise<string> {
    const client = plaidClient();
    const response = await client.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: "Summit",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
      transactions: { days_requested: 90 },
    });
    return response.data.link_token;
  }

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

  async syncPage(accessToken: string, cursor?: string): Promise<SyncPage> {
    const client = plaidClient();
    const response = await client.transactionsSync({
      access_token: accessToken,
      cursor: cursor ?? undefined,
      count: 500,
    });
    const data = response.data;

    const accountsResponse = await client.accountsGet({
      access_token: accessToken,
    });

    return {
      added: data.added.map(normalizeTransaction),
      modified: data.modified.map(normalizeTransaction),
      removedIds: data.removed.map((r) => r.transaction_id),
      accounts: accountsResponse.data.accounts.map(normalizeAccount),
      nextCursor: data.next_cursor,
      hasMore: data.has_more,
    };
  }
}

export function createIngestionAdapter(): IngestionAdapter {
  return new PlaidAdapter();
}
