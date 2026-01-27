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
    // Get raw query parameter value
    const url = new URL(c.req.url);
    const contractParam = url.searchParams.get('contract');

    // Check if contract param is a single value (not comma-separated) matching native address
    // Note: The comma check is intentional - the createQuerySchema batching feature uses comma
    // as the separator for multiple values (see zod.ts line 621). This ensures we only redirect
    // single-value requests, not batched requests with multiple contracts.
    if (
        contractParam &&
        contractParam.toLowerCase() === EVM_CONTRACT_NATIVE_EXAMPLE.toLowerCase() &&
        !contractParam.includes(',')
    ) {
        // Remove contract parameter
        url.searchParams.delete('contract');

        // Construct redirect URL to /native endpoint
        const currentPath = url.pathname;
        const nativePath = `${currentPath}/native`;
        url.pathname = nativePath;

        // Redirect to native endpoint with modified query params
        return c.redirect(url.toString());
    }

    // Continue with normal processing
    await next();
}
