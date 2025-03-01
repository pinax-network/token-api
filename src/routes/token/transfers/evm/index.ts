import { Context } from "hono";
import { makeUsageQuery } from "../../../../handleQuery.js";

// https://bun.sh/docs/api/sql
export default async function (ctx: Context) {
    const address = ctx.req.param("address");
    const query = `
    SELECT
        concat('0x', contract) as contract,
        concat('0x', from) as from,
        concat('0x', to) as to,
        toUnixTimestamp(timestamp) as timestamp,
        date
    FROM transfers
    WHERE from = {address: String} OR to = {address: String}
    ORDER BY block_num DESC`;
    return makeUsageQuery(ctx, [query], { address });
}