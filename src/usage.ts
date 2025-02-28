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

    let query = "";
    let additional_query_params: AdditionalQueryParams = {};

    switch (endpoint) {
        case "/account/balances": {
            // Need to narrow the type of `query_params` explicitly under the case to access properties based on endpoint value
            // See https://github.com/microsoft/TypeScript/issues/33014
            const q = query_params as ValidUserParams<typeof endpoint>;

            query = `SELECT
            contract,
            CAST(new_balance, 'String') AS balance,
            timestamp AS last_updated_at
            FROM balances
            WHERE owner = {account: String}
            ${q.contract ? ` AND contract = {contract: String}`: ``}
            ORDER BY last_updated_at DESC`;
            break;
        }

        case "/account/balances/historical": {
            const q = query_params as ValidUserParams<typeof endpoint>;

            query = `SELECT
            contract,
            CAST(new_balance, 'String') AS balance,
            timestamp AS last_updated_at
            FROM balances_by_date
            WHERE owner = {account: String} AND date = {date: String}
            ${q.contract ? ` AND contract = {contract: String}`: ``}
            ORDER BY last_updated_at DESC`;
            break;
        }

        default:
            // If this line throws an lint error, there is a missing endpoint case
            // Make sure all usage endpoints have a SQL query defined above.
            endpoint satisfies never;
    }

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

