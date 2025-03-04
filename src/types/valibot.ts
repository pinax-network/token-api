import * as v from 'valibot'

export const statisticsSchema = v.object({
    elapsed: v.optional(v.number()),
    rows_read: v.optional(v.number()),
    bytes_read: v.optional(v.number()),
});

export const metaSchema = v.object({
    statistics: v.optional(statisticsSchema),
    rows: v.optional(v.number()),
    rows_before_limit_at_least: v.optional(v.number()),
    request_time: v.optional(v.string()), // v.isoTimestamp('yyyy-mm-ddThh:mm:ss.sssZ')
    duration_ms: v.optional(v.number()),
});

export function parseEvmAddress(address: string): string|null {
    if (!address) return null;
    if (!(address.length == 40 || address.length == 42)) return null;
    return address.toLowerCase().replace(/^0x/, '');
}