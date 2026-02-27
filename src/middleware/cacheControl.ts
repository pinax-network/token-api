import { createHash } from 'node:crypto';
import type { Context, Next } from 'hono';
import { config } from '../config.js';

/**
 * Cache tier for HTTP Cache-Control headers.
 * - "default" uses cacheDurations[0] (e.g. 10s) — real-time data endpoints
 * - "long" uses cacheDurations[1] (e.g. 600s) — slow-changing metadata endpoints
 */
export type CacheTier = 'default' | 'long';

/**
 * Compute a weak ETag from the response body.
 * Uses MD5 for speed — this is not cryptographic, just a cache validator.
 */
function computeETag(body: string): string {
    const hash = createHash('md5').update(body).digest('hex').slice(0, 16);
    return `W/"${hash}"`;
}

/**
 * Hono middleware that adds HTTP Cache-Control and ETag headers to responses.
 *
 * Headers emitted:
 * - `Cache-Control: public, max-age=<browser>, s-maxage=<proxy>, stale-while-revalidate=30`
 * - `ETag: W/"<hash>"`
 *
 * Behavior:
 * - When `DISABLE_CACHE=true`, no cache headers are emitted.
 * - When the request has `Cache-Control: no-cache`, no cache headers are emitted.
 * - Supports `If-None-Match` → returns 304 Not Modified when ETag matches.
 * - `s-maxage` is set from `CACHE_DURATIONS` env (proxy TTL for Caddy/Envoy).
 * - `max-age` is set to half of `s-maxage` (browser TTL), minimum 5s.
 * - `stale-while-revalidate=30` allows proxies to serve stale while refreshing (RFC 5861).
 *   Caddy supports this via cache-handler; Envoy does not yet, but the header is future-proof.
 *
 * @param tier - Cache tier: "default" or "long"
 */
export function cacheControl(tier: CacheTier = 'default') {
    return async (ctx: Context, next: Next) => {
        await next();

        // Skip cache headers if caching is disabled
        if (config.disableCache) return;

        // Skip cache headers if client requests no-cache
        if (ctx.req.header('Cache-Control') === 'no-cache') return;

        // Only cache successful JSON responses
        if (ctx.res.status !== 200) return;

        const proxyTtl = (tier === 'long' ? config.cacheDurations[1] : config.cacheDurations[0]) ?? 10;
        const browserTtl = Math.max(5, Math.floor(proxyTtl / 2));

        ctx.res.headers.set(
            'Cache-Control',
            `public, max-age=${browserTtl}, s-maxage=${proxyTtl}, stale-while-revalidate=30`
        );

        // Compute and set ETag from response body
        const body = await ctx.res.clone().text();
        const etag = computeETag(body);
        ctx.res.headers.set('ETag', etag);

        // Support conditional requests (If-None-Match)
        const ifNoneMatch = ctx.req.header('If-None-Match');
        if (ifNoneMatch && ifNoneMatch === etag) {
            // Replace the response with 304 Not Modified
            ctx.res = new Response(null, {
                status: 304,
                headers: {
                    'Cache-Control': ctx.res.headers.get('Cache-Control') ?? '',
                    ETag: etag,
                },
            });
        }
    };
}
