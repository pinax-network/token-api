import { Context } from "hono";
import { makeUsageQuery } from "../../../../usage.js";

// https://bun.sh/docs/api/sql
export default async function (ctx: Context) {
    const address = ctx.req.param("address");
    const query = `
    SELECT
        contract,
        from,
        to,
        timestamp
    FROM transfers
    WHERE from = {address: String} OR to = {address: String}
    ORDER BY block_num DESC`;
    return makeUsageQuery(ctx, [query], { address });
}
