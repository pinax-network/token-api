import { makeQuery } from "./clickhouse/makeQuery.js";
import { APIErrorResponse } from "./utils.js";

import type { Context } from "hono";
import type { AdditionalQueryParams, UsageEndpoints, UsageResponse, ValidUserParams } from "./types/api.js";

/**
 * This function creates and send the SQL queries to the ClickHouse database based on the endpoint requested.
 * 
 * Both the REST API and GraphQL endpoint use those.
 * `endpoint` is a valid "Usage" endpoint (e.g. not a `/version`, `/metrics`, etc. endpoint, an actual data endpoint).
 * `user_params` is an key-value object created from the path and query parameters present in the request.
 **/

export async function makeUsageQuery(ctx: Context, endpoint: UsageEndpoints, user_params: ValidUserParams<typeof endpoint>) {
    type UsageElementReturnType = UsageResponse<typeof endpoint>[number];

    let { page, ...query_params } = user_params;

    const table_name = endpoint.split("/")[1];

    if (!query_params.limit)
        query_params.limit = 10;

    if (!page)
        page = 1;

    let filters = "";
    // Don't add `limit` and `block_range` to WHERE clause
    for (const k of Object.keys(query_params).filter(k => k !== "limit" && k !== "block_range")) {
        // if (k === 'account' && endpoint === '/account/transfers')
        //     continue;

        if (k === 'account') {
            filters += ` (owner = {account: String}) AND`;
            continue
        }

        const clickhouse_type = typeof query_params[k as keyof typeof query_params] === "number" ? "int" : "String";
        filters += ` (${k} = {${k}: ${clickhouse_type}}) AND`;
    }

    filters = filters.substring(0, filters.lastIndexOf(' ')); // Remove last item ` AND`
    if (filters.length)
        filters = `WHERE ${filters}`;

    let query = "";
    let additional_query_params: AdditionalQueryParams = {};

    // Parse block range for endpoints that uses it. Check for single value or two values.
    // if (endpoint == "/transfers" || endpoint == "/account/transfers") {
    //     const q = query_params as ValidUserParams<typeof endpoint>;
    //     if (q.block_range) {
    //         if (q.block_range[0] && q.block_range[1]) {
    //             filters +=
    //                 `${filters.length ? "AND" : "WHERE"}` +
    //                 ` (block_num >= {min_block: int} AND block_num <= {max_block: int})`;
    //             // Use Min/Max to account for any ordering of parameters
    //             additional_query_params.min_block = Math.min(q.block_range[0], q.block_range[1]);
    //             additional_query_params.max_block = Math.max(q.block_range[0], q.block_range[1]);
    //         } else if (q.block_range[0]) {
    //             filters +=
    //                 `${filters.length ? "AND" : "WHERE"}` +
    //                 ` (block_num >= {min_block: int})`;
    //             additional_query_params.min_block = q.block_range[0];
    //         }
    //     }
    // }

    if (endpoint == "/account/balances") {
        query +=
            `SELECT block_num AS last_updated_block, contract, new_balance as balance FROM balances`
            + ` ${filters} ORDER BY value DESC`
    }
    // else if (endpoint == "/account/balances/historical") {
    //     query +=
    //         `SELECT * FROM historical_account_balances`
    //         + ` ${filters} ORDER BY value DESC`
    // } else if (endpoint == "/tokens/supplies") {
    //     // Need to narrow the type of `query_params` explicitly to access properties based on endpoint value
    //     // See https://github.com/microsoft/TypeScript/issues/33014
    //     const q = query_params as ValidUserParams<typeof endpoint>;
    //     query +=
    //         `SELECT * FROM ${q.block_num ? 'historical_' : ''}token_supplies`
    //         + ` ${filters} ORDER BY block_num DESC`;
    // } else if (endpoint == "/transfers") {
    //     query += `SELECT * FROM `;

    //     const q = query_params as ValidUserParams<typeof endpoint>;
    //     if (q.contract && q.symcode)
    //         query += `transfers_contract`;
    //     else
    //         query += `transfers_block_num`;

    //     query += ` ${filters} ORDER BY block_num DESC`;
    // } else if (endpoint == "/account/transfers") {
    //     const q = query_params as ValidUserParams<typeof endpoint>;
    //     query +=
    //         `SELECT * FROM`
    //         + ` ((SELECT * FROM ${q.block_range ? 'historical_' : ''}transfers_from FINAL WHERE (from = {account: String}))`
    //         + ` UNION ALL (SELECT * FROM ${q.block_range ? 'historical_' : ''}transfers_to FINAL WHERE (to = {account: String})))`
    //         + ` ${filters} ORDER BY block_num DESC`;
    // } else if (endpoint == "/transfers/id") {
    //     query += `SELECT * FROM transfer_events ${filters} ORDER BY action_index`;
    // } else if (endpoint == "/tokens/holders") {
    //     filters += ` AND has_null_balance = 0`;
    //     query += `SELECT account, value AS balance FROM token_holders FINAL ${filters} ORDER BY value DESC`;
    // } else if (endpoint == "/tokens") {
        // NB: Using `account_balances` seems to return the most results
        //     Have to try with fully synced chain to compare with `create_events` and others
    //     query += `SELECT contract, symcode FROM account_balances GROUP BY (contract, symcode) ${filters}`;
    // }

    query += " LIMIT {limit: int}";
    query += " OFFSET {offset: int}";

    let query_results;
    additional_query_params.offset = query_params.limit * (page - 1);
    try {
        query_results = await makeQuery<UsageElementReturnType>(query, { ...query_params, ...additional_query_params });
        if (query_results.data.length === 0) {
            return APIErrorResponse(ctx, 404, "not_found_data", `No data found for ${table_name}`);
        }
    } catch (err) {
        return APIErrorResponse(ctx, 500, "bad_database_response", err);
    }

    // Always have a least one total page
    const total_pages = Math.max(Math.ceil((query_results.rows_before_limit_at_least ?? 0) / query_params.limit), 1);

    if (page > total_pages)
        return APIErrorResponse(ctx, 400, "bad_query_input", `Requested page (${page}) exceeds total pages (${total_pages})`);

    /* Solving the `data` type issue:
    type A = string[] | number[]; // This is union of array types
    type B = A[number][]; // This is array of elements of union type

    let t: A;
    let v: B;

    t = v; // Error
    */

    return ctx.json<UsageResponse<typeof endpoint>, 200>({
        // @ts-ignore
        data: query_results.data,
        meta: {
            statistics: query_results.statistics ?? null,
            next_page: (page * query_params.limit >= (query_results.rows_before_limit_at_least ?? 0)) ? page : page + 1,
            previous_page: (page <= 1) ? page : page - 1,
            total_pages,
            total_results: query_results.rows_before_limit_at_least ?? 0
        }
    });
}

