import type { Context, Next } from 'hono';
import { EVM_CONTRACT_NATIVE_EXAMPLE } from '../types/examples.js';

/**
 * Middleware to redirect requests with native contract address to /native endpoint.
 *
 * This is a TEMPORARY migration feature to help users transition to the new /native endpoints.
 * TODO: Remove this middleware once migration is complete.
 *
 * Checks if the 'contract' query parameter is a single value matching the native contract address
 * (0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee). If so, redirects to the /native sub-route
 * and removes the contract parameter.
 *
 * @param c - Hono context
 * @param next - Next middleware function
 */
export async function nativeContractRedirect(c: Context, next: Next) {
    const url = new URL(c.req.url);
    const contractValues = url.searchParams.getAll('contract');
    const only = contractValues.length === 1 ? contractValues[0] : undefined;

    if (only && !only.includes(',') && only.toLowerCase() === EVM_CONTRACT_NATIVE_EXAMPLE.toLowerCase()) {
        url.searchParams.delete('contract');
        const query = url.searchParams.toString();
        return c.redirect(`${url.pathname}/native${query ? `?${query}` : ''}`);
    }

    await next();
}

const NATIVE_MINT_ALIASES = new Set([
    '11111111111111111111111111111111',
    'so11111111111111111111111111111111111111111',
    'sol11111111111111111111111111111111',
]);

/**
 * Middleware to redirect requests with a native-SOL placeholder mint to the /native endpoint.
 *
 * This is a TEMPORARY migration feature to help users transition to the new /native endpoints.
 * TODO: Remove this middleware once migration is complete.
 *
 * Accepts several aliases users might copy from responses or docs (system program, `So1..111`
 * placeholder returned by /native routes, `sol1..1` legacy alias). Real wSOL (`So1..112`) is
 * intentionally excluded — it's a regular SPL token and should hit the normal route.
 *
 * @param c - Hono context
 * @param next - Next middleware function
 */
export async function nativeMintRedirect(c: Context, next: Next) {
    const url = new URL(c.req.url);
    const mintValues = url.searchParams.getAll('mint');
    const only = mintValues.length === 1 ? mintValues[0] : undefined;

    if (only && !only.includes(',') && NATIVE_MINT_ALIASES.has(only.toLowerCase())) {
        url.searchParams.delete('mint');
        const query = url.searchParams.toString();
        return c.redirect(`${url.pathname}/native${query ? `?${query}` : ''}`);
    }

    await next();
}
