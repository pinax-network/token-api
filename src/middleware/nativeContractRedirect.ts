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
    const contractParam = url.searchParams.get('contract');

    if (
        contractParam &&
        contractParam.toLowerCase() === EVM_CONTRACT_NATIVE_EXAMPLE.toLowerCase() &&
        !contractParam.includes(',')
    ) {
        url.searchParams.delete('contract');
        const query = url.searchParams.toString();
        return c.redirect(`${url.pathname}/native${query ? `?${query}` : ''}`);
    }

    await next();
}

/**
 * Middleware to redirect requests with native contract address to /native endpoint.
 *
 * This is a TEMPORARY migration feature to help users transition to the new /native endpoints.
 * TODO: Remove this middleware once migration is complete.
 *
 * Checks if the 'contract' query parameter is a single value matching the native contract address
 * (11111111111111111111111111111111). If so, redirects to the /native sub-route
 * and removes the contract parameter.
 *
 * @param c - Hono context
 * @param next - Next middleware function
 */
export async function nativeMintRedirect(c: Context, next: Next) {
    const url = new URL(c.req.url);
    const mintParam = url.searchParams.get('mint');

    if (
        mintParam &&
        (mintParam.toLowerCase() === '11111111111111111111111111111111' ||
            mintParam.toLowerCase() === 'sol11111111111111111111111111111111') &&
        !mintParam.includes(',')
    ) {
        url.searchParams.delete('mint');
        const query = url.searchParams.toString();
        return c.redirect(`${url.pathname}/native${query ? `?${query}` : ''}`);
    }

    await next();
}
