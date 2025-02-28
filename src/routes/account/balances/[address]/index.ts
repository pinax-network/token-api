import { Context } from "hono";
import { makeUsageQuery } from "../../../../usage.js";

// https://bun.sh/docs/api/sql
export default async function (ctx: Context) {
    const address = ctx.req.param("address");
    const query = `
    SELECT
        contract,
        CAST(new_balance, 'String') AS balance,
        timestamp
    FROM balances
    WHERE (owner = {address: String})
    ORDER BY block_num DESC`;
    return makeUsageQuery(ctx, [query], { address });
}