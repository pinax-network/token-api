import { z } from "zod";

import { operations, paths } from './zod.gen.js';

type GetEndpoints = typeof paths;
export type EndpointReturnTypes<E extends keyof GetEndpoints> = z.infer<GetEndpoints[E]["get"]["responses"]["default"]>;
export type EndpointParameters<E extends keyof GetEndpoints> = GetEndpoints[E]["get"]["parameters"];

export type NonUsageEndpoints = "/head" | "/health" | "/metrics" | "/version" | "/openapi";
// Usage endpoints interacts with the database
export type UsageEndpoints = Exclude<keyof GetEndpoints, NonUsageEndpoints>;
export type UsageResponse<E extends UsageEndpoints> = EndpointReturnTypes<E>["data"];
export type UsageParameters<E extends UsageEndpoints> = EndpointParameters<E>;

export type ValidPathParams<E extends UsageEndpoints> = EndpointParameters<E>["path"];
export type ValidUserParams<E extends UsageEndpoints> = NonNullable<EndpointParameters<E> extends { path: undefined; } ?
    // Combine path and query parameters only if path exists to prevent "never" on intersection
    z.infer<EndpointParameters<E>["query"]>
    :
    z.infer<EndpointParameters<E>["query"] & ValidPathParams<E>>>;
export type AdditionalQueryParams = { offset?: number; min_block?: number; max_block?: number; };
// Allow any valid parameters from the endpoint to be used as SQL query parameters
export type ValidQueryParams = ValidUserParams<UsageEndpoints> & AdditionalQueryParams;

// Map stripped operations name (e.g. `Usage_transfers` stripped to `transfers`) to endpoint paths (e.g. `/transfers`)
export const usageOperationsToEndpointsMap = Object.entries(operations).filter(([k, _]) => k.startsWith("Usage")).reduce(
    (o, [k, v]) => Object.assign(
        o, 
        {
            // Split once on first underscore to create keys (e.g. `Usage_transfersAccount` => `transfersAccount`)
            [k.split('_')[1] as string]: Object.entries(paths).find(([_, v_]) => v_.get === v)?.[0]
        }
    ), {}
) as { [key in string]: UsageEndpoints };