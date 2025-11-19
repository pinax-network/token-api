import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import { handleUsageQueryError } from '../handleQuery.js';
import { dexService } from '../services/DexService.js';
import {
    booleanFromString,
    createQuerySchema,
    evmFactorySchema,
    evmNetworkIdSchema,
    evmPoolSchema,
    intervalSchema,
    svmAmmPoolSchema,
    svmAmmSchema,
    svmAuthoritySchema,
    svmMintSchema,
    svmNetworkIdSchema,
    timestampSchema,
    tvmFactorySchema,
    tvmNetworkIdSchema,
    tvmPoolSchema,
} from '../types/zod.js';
import { validatorHook, withErrorResponses } from '../utils.js';

// Schemas
const evmDexesQuerySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },
    factory: { schema: evmFactorySchema, batched: true, default: '' },
});

const svmDexesQuerySchema = createQuerySchema({
    network: { schema: svmNetworkIdSchema },
    amm: { schema: svmAmmSchema, batched: true, default: '' },
});

const tvmDexesQuerySchema = createQuerySchema({
    network: { schema: tvmNetworkIdSchema },
    factory: { schema: tvmFactorySchema, batched: true, default: '' },
});

const evmPoolsQuerySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },
    pool: { schema: evmPoolSchema, batched: true, default: '' },
});

const svmPoolsQuerySchema = createQuerySchema({
    network: { schema: svmNetworkIdSchema },
    amm: { schema: svmAmmSchema, batched: true, default: '' },
    pool: { schema: svmAmmPoolSchema, batched: true, default: '' },
    mint: { schema: svmMintSchema, batched: true, default: '' },
    authority: { schema: svmAuthoritySchema, batched: true, default: '' },
});

const tvmPoolsQuerySchema = createQuerySchema({
    network: { schema: tvmNetworkIdSchema },
    pool: { schema: tvmPoolSchema, batched: true, default: '' },
});

const evmSwapsQuerySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },
    pool: { schema: evmPoolSchema, batched: true, default: '' },
    transaction: { schema: z.string(), batched: true, default: '' },
    block_number: { schema: z.number(), default: 0 },
    include_pagination: { schema: booleanFromString, default: true },
});

const svmSwapsQuerySchema = createQuerySchema({
    network: { schema: svmNetworkIdSchema },
    pool: { schema: svmAmmPoolSchema, batched: true, default: '' },
    transaction: { schema: z.string(), batched: true, default: '' },
    block_number: { schema: z.number(), default: 0 },
    include_pagination: { schema: booleanFromString, default: true },
});

const tvmSwapsQuerySchema = createQuerySchema({
    network: { schema: tvmNetworkIdSchema },
    pool: { schema: tvmPoolSchema, batched: true, default: '' },
    transaction: { schema: z.string(), batched: true, default: '' },
    block_number: { schema: z.number(), default: 0 },
    include_pagination: { schema: z.boolean().default(true) },
});

const evmPoolsOhlcQuerySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },
    pool: { schema: evmPoolSchema },
    interval: { schema: intervalSchema, default: '1h' },
    time_from: { schema: timestampSchema, default: 0 },
    time_to: { schema: timestampSchema, default: 0 },
});

const tvmPoolsOhlcQuerySchema = createQuerySchema({
    network: { schema: tvmNetworkIdSchema },
    pool: { schema: tvmPoolSchema },
    interval: { schema: intervalSchema, default: '1h' },
    time_from: { schema: timestampSchema, default: 0 },
    time_to: { schema: timestampSchema, default: 0 },
});

const svmPoolsOhlcQuerySchema = createQuerySchema({
    network: { schema: svmNetworkIdSchema },
    pool: { schema: svmAmmPoolSchema },
    interval: { schema: intervalSchema, default: '1h' },
    time_from: { schema: timestampSchema, default: 0 },
    time_to: { schema: timestampSchema, default: 0 },
});

export class DexController {
    public route = new Hono();

    constructor() {
        this.setupRoutes();
    }

    private setupRoutes() {
        // EVM Routes
        this.route.get(
            '/evm/dexes',
            describeRoute(withErrorResponses({ tags: ['EVM DEX'], summary: 'DEX Metadata' })),
            validator('query', evmDexesQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await dexService.getDexes(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/evm/pools',
            describeRoute(withErrorResponses({ tags: ['EVM DEX'], summary: 'Liquidity Pools' })),
            validator('query', evmPoolsQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await dexService.getPools(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/evm/swaps',
            describeRoute(withErrorResponses({ tags: ['EVM DEX'], summary: 'DEX Swaps' })),
            validator('query', evmSwapsQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await dexService.getSwaps(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/evm/pools/ohlc',
            describeRoute(withErrorResponses({ tags: ['EVM DEX'], summary: 'Pool OHLC' })),
            validator('query', evmPoolsOhlcQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await dexService.getPoolsOhlc(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        // SVM Routes
        this.route.get(
            '/svm/dexes',
            describeRoute(withErrorResponses({ tags: ['SVM DEX'], summary: 'DEX Metadata' })),
            validator('query', svmDexesQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await dexService.getDexes(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/svm/pools',
            describeRoute(withErrorResponses({ tags: ['SVM DEX'], summary: 'Liquidity Pools' })),
            validator('query', svmPoolsQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await dexService.getPools(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/svm/swaps',
            describeRoute(withErrorResponses({ tags: ['SVM DEX'], summary: 'DEX Swaps' })),
            validator('query', svmSwapsQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await dexService.getSwaps(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/svm/pools/ohlc',
            describeRoute(withErrorResponses({ tags: ['SVM DEX'], summary: 'Pool OHLC' })),
            validator('query', svmPoolsOhlcQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await dexService.getPoolsOhlc(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        // TVM Routes
        this.route.get(
            '/tvm/dexes',
            describeRoute(withErrorResponses({ tags: ['TVM DEX'], summary: 'DEX Metadata' })),
            validator('query', tvmDexesQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await dexService.getDexes(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/tvm/pools',
            describeRoute(withErrorResponses({ tags: ['TVM DEX'], summary: 'Liquidity Pools' })),
            validator('query', tvmPoolsQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await dexService.getPools(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/tvm/swaps',
            describeRoute(withErrorResponses({ tags: ['TVM DEX'], summary: 'DEX Swaps' })),
            validator('query', tvmSwapsQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await dexService.getSwaps(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/tvm/pools/ohlc',
            describeRoute(withErrorResponses({ tags: ['TVM DEX'], summary: 'Pool OHLC' })),
            validator('query', tvmPoolsOhlcQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await dexService.getPoolsOhlc(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );
    }
}

export const dexController = new DexController();
