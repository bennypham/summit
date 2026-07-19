/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as auth from "../auth.js";
import type * as budgets from "../budgets.js";
import type * as categories from "../categories.js";
import type * as crons from "../crons.js";
import type * as functions from "../functions.js";
import type * as ingestion_plaid from "../ingestion/plaid.js";
import type * as ingestion_types from "../ingestion/types.js";
import type * as items from "../items.js";
import type * as lib_categories from "../lib/categories.js";
import type * as lib_session from "../lib/session.js";
import type * as plaidActions from "../plaidActions.js";
import type * as plaidInternal from "../plaidInternal.js";
import type * as seed from "../seed.js";
import type * as transactions from "../transactions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  auth: typeof auth;
  budgets: typeof budgets;
  categories: typeof categories;
  crons: typeof crons;
  functions: typeof functions;
  "ingestion/plaid": typeof ingestion_plaid;
  "ingestion/types": typeof ingestion_types;
  items: typeof items;
  "lib/categories": typeof lib_categories;
  "lib/session": typeof lib_session;
  plaidActions: typeof plaidActions;
  plaidInternal: typeof plaidInternal;
  seed: typeof seed;
  transactions: typeof transactions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
