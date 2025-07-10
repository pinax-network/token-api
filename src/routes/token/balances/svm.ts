import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { svmAddressSchema, paginationQuery, statisticsSchema, SVM_networkIdSchema, filterByMint, RaydiumWSOLMarketTokenAccount, SolanaSPLTokenProgramIds, WSOL, filterByTokenAccount } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../config.js';
import { injectSymbol } from '../../../inject/symbol.js';

const route = new Hono();

let querySchema = z.object({
    token_account: z.optional(filterByTokenAccount),
    mint: z.optional(WSOL),
    program_id: z.optional(SolanaSPLTokenProgramIds),
    network_id: z.optional(SVM_networkIdSchema),
}).merge(paginationQuery);

let responseSchema = z.object({
    data: z.array(z.object({
        // -- block --
        block_num: z.number(),
        datetime: z.string(),
        timestamp: z.number(),

        // -- transaction --
        // signature: z.string(),

        // -- instruction --
        program_id: svmAddressSchema,

        // -- balance --
        token_account: svmAddressSchema,
        mint: svmAddressSchema,
        amount: z.string(),
        value: z.number(),
        decimals: z.number(),

        // -- network --
        network_id: SVM_networkIdSchema,

        // // -- contract --
        // decimals: z.optional(z.number())
    })),
    statistics: z.optional(statisticsSchema),
});

let openapi = describeRoute({
    summary: 'Balances',
    description: 'Provides Solana SPL tokens balances by token account address.',
    tags: ['SVM'],
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Successful Response',
            content: {
                'application/json': {
                    schema: resolver(responseSchema), example: {
                        data: [
                            {
                                "block_num": 352305913,
                                "datetime": "2025-07-10 05:14:43",
                                "timestamp": 1752124483,
                                "program_id": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                                "token_account": "4ct7br2vTPzfdmY3S5HLtTxcGSBfn6pnw98hsS6v359A",
                                "mint": "So11111111111111111111111111111111111111112",
                                "amount": "30697740781078",
                                "value": 30697.740781078,
                                "decimals": 9,
                                "network_id": "solana"
                            }
                        ]
                    }
                },
            },
        }
    },
});

route.get('/', openapi, validator('query', querySchema), async (c) => {

    let token_account = c.req.query("token_account") ?? '';
    if (token_account) {
        const parsed = svmAddressSchema.safeParse(token_account);
        if (!parsed.success) {
            return c.json({ error: `Invalid [token_account] SVM address: ${parsed.error.message}` }, 400);
        }
        token_account = parsed.data;
    }

    let mint = c.req.query("mint") ?? '';
    if (mint) {
        const parsed = svmAddressSchema.safeParse(mint);
        if (!parsed.success) {
            return c.json({ error: `Invalid [mint] SVM address: ${parsed.error.message}` }, 400);
        }
        mint = parsed.data;
    }

    let program_id = c.req.query("program_id") ?? '';
    if (program_id) {
        const parsed = svmAddressSchema.safeParse(program_id);
        if (!parsed.success) {
            return c.json({ error: `Invalid [program_id] SVM address: ${parsed.error.message}` }, 400);
        }
        program_id = parsed.data;
    }

    const network_id = SVM_networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultSvmNetwork;
    const { database, type } = config.tokenDatabases[network_id]!;

    const query = sqlQueries['balances_for_account']?.[config.tokenDatabases[network_id]!.type];
    if (!query) return c.json({ error: 'Query for balances could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { token_account, mint, network_id, program_id }, { database });
    injectSymbol(response, network_id);
    // await injectPrices(response, network_id);
    return handleUsageQueryError(c, response);
});

export default route;
