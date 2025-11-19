import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import { handleUsageQueryError } from '../handleQuery.js';
import { tokenService } from '../services/TokenService.js';
import {
    createQuerySchema,
    evmAddressSchema,
    evmContractSchema,
    evmNetworkIdSchema,
    includeNullBalancesSchema,
    svmMintSchema,
    svmNetworkIdSchema,
    svmOwnerSchema,
    svmSPLTokenProgramIdSchema,
    svmTokenAccountSchema,
    tvmAddressSchema,
    tvmContractSchema,
    tvmNetworkIdSchema,
} from '../types/zod.js';
import { validatorHook, withErrorResponses } from '../utils.js';

// Schemas (reused from existing routes)
const evmBalancesQuerySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },
    address: { schema: evmAddressSchema, batched: true },
    contract: { schema: evmContractSchema, batched: true, default: '' },
    include_null_balances: { schema: includeNullBalancesSchema, default: false },
});

const svmBalancesQuerySchema = createQuerySchema({
    network: { schema: svmNetworkIdSchema },
    owner: { schema: svmOwnerSchema, batched: true },
    token_account: { schema: svmTokenAccountSchema, batched: true, default: '' },
    mint: { schema: svmMintSchema, batched: true, default: '' },
    program_id: { schema: svmSPLTokenProgramIdSchema, default: '' },
    include_null_balances: { schema: includeNullBalancesSchema, default: false },
});

const tvmBalancesQuerySchema = createQuerySchema({
    network: { schema: tvmNetworkIdSchema },
    address: { schema: tvmAddressSchema, batched: true },
    contract: { schema: tvmContractSchema, batched: true, default: '' },
    include_null_balances: { schema: includeNullBalancesSchema, default: false },
});

const evmTokensQuerySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },
    contract: { schema: evmContractSchema, batched: true },
});

const svmTokensQuerySchema = createQuerySchema({
    network: { schema: svmNetworkIdSchema },
    mint: { schema: svmMintSchema, batched: true },
});

const tvmTokensQuerySchema = createQuerySchema({
    network: { schema: tvmNetworkIdSchema },
    contract: { schema: tvmContractSchema, batched: true },
});

const evmHoldersQuerySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },
    contract: { schema: evmContractSchema },
    include_pagination: { schema: z.boolean().default(true) },
});

const svmHoldersQuerySchema = createQuerySchema({
    network: { schema: svmNetworkIdSchema },
    mint: { schema: svmMintSchema },
    include_pagination: { schema: z.boolean().default(true) },
});

const tvmHoldersQuerySchema = createQuerySchema({
    network: { schema: tvmNetworkIdSchema },
    contract: { schema: tvmContractSchema },
    include_pagination: { schema: z.boolean().default(true) },
});

const evmTransfersQuerySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },
    contract: { schema: evmContractSchema, batched: true, default: '' },
    from: { schema: evmAddressSchema, batched: true, default: '' },
    to: { schema: evmAddressSchema, batched: true, default: '' },
    transaction: { schema: z.string(), batched: true, default: '' },
    block_number: { schema: z.number(), default: 0 },
    include_pagination: { schema: z.boolean().default(true) },
});

const svmTransfersQuerySchema = createQuerySchema({
    network: { schema: svmNetworkIdSchema },
    mint: { schema: svmMintSchema, batched: true, default: '' },
    from: { schema: svmOwnerSchema, batched: true, default: '' },
    to: { schema: svmOwnerSchema, batched: true, default: '' },
    transaction: { schema: z.string(), batched: true, default: '' },
    block_number: { schema: z.number(), default: 0 },
    include_pagination: { schema: z.boolean().default(true) },
});

const tvmTransfersQuerySchema = createQuerySchema({
    network: { schema: tvmNetworkIdSchema },
    contract: { schema: tvmContractSchema, batched: true, default: '' },
    from: { schema: tvmAddressSchema, batched: true, default: '' },
    to: { schema: tvmAddressSchema, batched: true, default: '' },
    transaction: { schema: z.string(), batched: true, default: '' },
    block_number: { schema: z.number(), default: 0 },
    include_pagination: { schema: z.boolean().default(true) },
});

// Response Schemas (simplified for brevity, ideally should be imported or defined fully)
// Using apiUsageResponseSchema.extend for now as in original code

export class TokenController {
    public route = new Hono();

    constructor() {
        this.setupRoutes();
    }

    private setupRoutes() {
        // EVM Routes
        this.route.get(
            '/evm/balances',
            describeRoute(withErrorResponses({ tags: ['EVM Tokens'], summary: 'Token Balances' })),
            validator('query', evmBalancesQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await tokenService.getBalances(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/evm/tokens',
            describeRoute(withErrorResponses({ tags: ['EVM Tokens'], summary: 'Token Metadata' })),
            validator('query', evmTokensQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await tokenService.getTokens(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/evm/holders',
            describeRoute(withErrorResponses({ tags: ['EVM Tokens'], summary: 'Token Holders' })),
            validator('query', evmHoldersQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await tokenService.getHolders(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/evm/transfers',
            describeRoute(withErrorResponses({ tags: ['EVM Tokens'], summary: 'Token Transfers' })),
            validator('query', evmTransfersQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await tokenService.getTransfers(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        // SVM Routes
        this.route.get(
            '/svm/balances',
            describeRoute(withErrorResponses({ tags: ['SVM Tokens'], summary: 'Token Balances' })),
            validator('query', svmBalancesQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await tokenService.getBalances(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/svm/tokens',
            describeRoute(withErrorResponses({ tags: ['SVM Tokens'], summary: 'Token Metadata' })),
            validator('query', svmTokensQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await tokenService.getTokens(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/svm/holders',
            describeRoute(withErrorResponses({ tags: ['SVM Tokens'], summary: 'Token Holders' })),
            validator('query', svmHoldersQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await tokenService.getHolders(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/svm/transfers',
            describeRoute(withErrorResponses({ tags: ['SVM Tokens'], summary: 'Token Transfers' })),
            validator('query', svmTransfersQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await tokenService.getTransfers(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        // TVM Routes
        this.route.get(
            '/tvm/balances',
            describeRoute(withErrorResponses({ tags: ['TVM Tokens'], summary: 'Token Balances' })),
            validator('query', tvmBalancesQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await tokenService.getBalances(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/tvm/tokens',
            describeRoute(withErrorResponses({ tags: ['TVM Tokens'], summary: 'Token Metadata' })),
            validator('query', tvmTokensQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await tokenService.getTokens(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/tvm/holders',
            describeRoute(withErrorResponses({ tags: ['TVM Tokens'], summary: 'Token Holders' })),
            validator('query', tvmHoldersQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await tokenService.getHolders(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/tvm/transfers',
            describeRoute(withErrorResponses({ tags: ['TVM Tokens'], summary: 'Token Transfers' })),
            validator('query', tvmTransfersQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await tokenService.getTransfers(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );
    }
}

export const tokenController = new TokenController();
