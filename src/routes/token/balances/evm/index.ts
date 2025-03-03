import { z } from "zod";
import { evmAddress } from "../../../../types/zod.js";
import { Context } from "hono";
import { makeUsageQuery } from "../../../../handleQuery.js";

export const data = z.object({
    "timestamp": z.coerce.number().int(),
    "date": z.coerce.date(),
    "contract": z.lazy(() => evmAddress),
    "amount": z.coerce.number().int()
});
export type Data = z.infer<typeof data>;

export const query = z.object({
    "address": z.lazy(() => evmAddress),
    "contract": z.lazy(() => evmAddress).optional(),
});
export type Query = z.infer<typeof query>;

// https://bun.sh/docs/api/sql
export default async function (ctx: Context) {
    const address = ctx.req.param("address");
    const query = `
    SELECT
        concat('0x', contract) as contract,
        CAST(new_balance, 'String') AS amount,
        toUnixTimestamp(timestamp) as timestamp,
        date
    FROM balances
    WHERE owner = {address: String}
    ORDER BY block_num DESC`;
    return makeUsageQuery(ctx, [query], { address });
}