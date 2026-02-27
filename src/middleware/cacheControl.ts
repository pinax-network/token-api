import { createHash } from 'node:crypto';
import type { Context, Next } from 'hono';
import { config } from '../config.js';

/**
 * Compute a weak ETag from the response body.
 * Uses MD5 for speed — this is not cryptographic, just a cache validator.
 */
function computeETag(body: string): string {
    const hash = createHash('md5').update(body).digest('hex').slice(0, 16);
    return `W/"${hash}"`;
}

/**
 * Hono middleware that adds HTTP Cache-Control and ETag headers to cacheable responses.
 *
 * Headers emitted (on 200 responses):
 *   Cache-Control: public, max-age=<CACHE_MAX_AGE>, s-maxage=<CACHE_SERVER_MAX_AGE>, stale-while-revalidate=<CACHE_STALE_WHILE_REVALIDATE>
 *   ETag: W/"<hash>"
 *
 * Behaviour:
 * - When `CACHE_DISABLE=true`, no cache headers are emitted.
 * - When the request includes `Cache-Control: no-cache`, no cache headers are emitted.
 * - Supports `If-None-Match` → returns 304 Not Modified when ETag matches.
 *
 * Environment variables (all in seconds):
 *   CACHE_SERVER_MAX_AGE  – `s-maxage` for shared/proxy caches (Caddy, Envoy). Default: 600
 *   CACHE_MAX_AGE         – `max-age` for browser caches. Default: 60
 *   CACHE_STALE_WHILE_REVALIDATE – RFC 5861 stale-while-revalidate window. Default: 30
 *
 * Routes with `cacheControl()` get the full env-configured TTLs.
 * Routes with `cacheControlDefault()` get a minimal 1s cache (no stale-while-revalidate).
 *
 * @see https://datatracker.ietf.org/doc/html/rfc5861
 */
export function cacheControl() {
    return async (ctx: Context, next: Next) => {
        await next();

        // Skip cache headers if caching is disabled
        if (config.cacheDisable) return;

        // Skip cache headers if client requests no-cache
        if (ctx.req.header('Cache-Control') === 'no-cache') return;

        // Only cache successful responses
        if (ctx.res.status !== 200) return;

        const { cacheServerMaxAge, cacheMaxAge, cacheStaleWhileRevalidate } = config;

        ctx.res.headers.set(
            'Cache-Control',
            `public, max-age=${cacheMaxAge}, s-maxage=${cacheServerMaxAge}, stale-while-revalidate=${cacheStaleWhileRevalidate}`
        );

        // Compute and set ETag from response body
        const body = await ctx.res.clone().text();
        const etag = computeETag(body);
        ctx.res.headers.set('ETag', etag);

        // Support conditional requests (If-None-Match)
        const ifNoneMatch = ctx.req.header('If-None-Match');
        if (ifNoneMatch && ifNoneMatch === etag) {
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

/**
 * Lightweight default cache for all API routes (1s max-age, no stale-while-revalidate).
 * Applied globally to `/v1/*` — routes with `cacheControl()` will override this since
 * their middleware runs after and overwrites the Cache-Control header.
 */
export function cacheControlDefault() {
    return async (ctx: Context, next: Next) => {
        await next();

        if (config.cacheDisable) return;
        if (ctx.req.header('Cache-Control') === 'no-cache') return;
        if (ctx.res.status !== 200) return;

        // Only set if not already set by cacheControl()
        if (!ctx.res.headers.has('Cache-Control')) {
            ctx.res.headers.set('Cache-Control', 'public, max-age=1, s-maxage=1');
        }
    };
}
