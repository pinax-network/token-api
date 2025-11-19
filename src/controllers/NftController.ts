import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import { handleUsageQueryError } from '../handleQuery.js';
import { nftService } from '../services/NftService.js';
import {
    booleanFromString,
    createQuerySchema,
    evmAddressSchema,
    evmContractSchema,
    evmNetworkIdSchema,
    nftTokenIdSchema,
} from '../types/zod.js';
import { validatorHook, withErrorResponses } from '../utils.js';

// Schemas
const evmNftCollectionsQuerySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },
    contract: { schema: evmContractSchema, batched: true, default: '' },
});

const evmNftItemsQuerySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },
    contract: { schema: evmContractSchema, batched: true, default: '' },
    token_id: { schema: nftTokenIdSchema, batched: true, default: '' },
});

const evmNftOwnershipsQuerySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },
    contract: { schema: evmContractSchema, batched: true, default: '' },
    address: { schema: evmAddressSchema, batched: true, default: '' },
    token_id: { schema: nftTokenIdSchema, batched: true, default: '' },
});

const evmNftSalesQuerySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },
    contract: { schema: evmContractSchema, batched: true, default: '' },
    transaction: { schema: z.string(), batched: true, default: '' },
    block_number: { schema: z.number(), default: 0 },
    include_pagination: { schema: booleanFromString, default: true },
});

const evmNftTransfersQuerySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },
    contract: { schema: evmContractSchema, batched: true, default: '' },
    from: { schema: evmAddressSchema, batched: true, default: '' },
    to: { schema: evmAddressSchema, batched: true, default: '' },
    transaction: { schema: z.string(), batched: true, default: '' },
    block_number: { schema: z.number(), default: 0 },
    include_pagination: { schema: booleanFromString, default: true },
});

const evmNftHoldersQuerySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },
    contract: { schema: evmContractSchema },
    include_pagination: { schema: z.boolean().default(true) },
});

export class NftController {
    public route = new Hono();

    constructor() {
        this.setupRoutes();
    }

    private setupRoutes() {
        // EVM Routes
        this.route.get(
            '/evm/nft/collections',
            describeRoute(withErrorResponses({ tags: ['EVM NFT'], summary: 'NFT Collections' })),
            validator('query', evmNftCollectionsQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await nftService.getCollections(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/evm/nft/items',
            describeRoute(withErrorResponses({ tags: ['EVM NFT'], summary: 'NFT Items' })),
            validator('query', evmNftItemsQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await nftService.getItems(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/evm/nft/ownerships',
            describeRoute(withErrorResponses({ tags: ['EVM NFT'], summary: 'NFT Ownerships' })),
            validator('query', evmNftOwnershipsQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await nftService.getOwnerships(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/evm/nft/sales',
            describeRoute(withErrorResponses({ tags: ['EVM NFT'], summary: 'NFT Sales' })),
            validator('query', evmNftSalesQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await nftService.getSales(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/evm/nft/transfers',
            describeRoute(withErrorResponses({ tags: ['EVM NFT'], summary: 'NFT Transfers' })),
            validator('query', evmNftTransfersQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await nftService.getTransfers(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );

        this.route.get(
            '/evm/nft/holders',
            describeRoute(withErrorResponses({ tags: ['EVM NFT'], summary: 'NFT Holders' })),
            validator('query', evmNftHoldersQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await nftService.getHolders(params.network, params, {
                    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
                    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
                });
                return handleUsageQueryError(c, result);
            }
        );
    }
}

export const nftController = new NftController();
