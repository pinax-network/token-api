import type { Context, Next } from 'hono';

export async function normalizeProtocolQuery(c: Context, next: Next) {
    const url = new URL(c.req.url);
    const protocol = url.searchParams.get('protocol');

    if (protocol) {
        const normalizedProtocol = protocol.replaceAll('-', '_');

        if (normalizedProtocol !== protocol) {
            url.searchParams.set('protocol', normalizedProtocol);
            (c.req as { raw: Request }).raw = new Request(url.toString(), c.req.raw);
        }
    }

    await next();
}
