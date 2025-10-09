import { describe, expect, it } from 'bun:test';
import { z } from 'zod';
import {
    apiErrorResponseSchema,
    apiUsageResponseSchema,
    blockNumberSchema,
    clientErrorResponseSchema,
    createQuerySchema,
    evmAddress,
    evmAddressSchema,
    evmContractSchema,
    evmFactorySchema,
    evmNetworkIdSchema,
    evmPoolSchema,
    evmProtocolSchema,
    evmTokenResponseSchema,
    evmTransaction,
    evmTransactionSchema,
    includeNullBalancesSchema,
    intervalSchema,
    limitSchema,
    nftTokenIdSchema,
    nftTokenStandardSchema,
    pageSchema,
    paginationQuerySchema,
    paginationResponseSchema,
    serverErrorResponseSchema,
    statisticsResponseSchema,
    svmAddress,
    svmAddressSchema,
    svmAmmPoolSchema,
    svmAmmSchema,
    svmAuthoritySchema,
    svmMetadataSchema,
    svmMintResponseSchema,
    svmMintSchema,
    svmNetworkIdSchema,
    svmOwnerSchema,
    svmProgramIdSchema,
    svmProtocolSchema,
    svmSPLTokenProgramIdSchema,
    svmTokenAccountSchema,
    svmTransaction,
    svmTransactionSchema,
    timestampSchema,
} from './zod.js';

describe('Base Validation Schemas', () => {
    describe('evmAddress', () => {
        it('should validate correct EVM addresses', () => {
            expect(evmAddress.parse('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')).toBe(
                '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'
            );
            expect(evmAddress.parse('d8dA6BF26964aF9D7eEd9e03E53415D37aA96045')).toBe(
                '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'
            );
        });

        it('should transform addresses to lowercase with 0x prefix', () => {
            const result = evmAddress.parse('D8DA6BF26964AF9D7EED9E03E53415D37AA96045');
            expect(result).toBe('0xd8da6bf26964af9d7eed9e03e53415d37aa96045');
        });

        it('should reject invalid EVM addresses', () => {
            expect(() => evmAddress.parse('invalid')).toThrow();
            expect(() => evmAddress.parse('0x123')).toThrow();
            expect(() => evmAddress.parse('0xGGGG6BF26964aF9D7eEd9e03E53415D37aA96045')).toThrow();
        });
    });

    describe('evmTransaction', () => {
        it('should validate correct EVM transaction hashes', () => {
            const validTx = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            expect(evmTransaction.parse(validTx)).toBe(validTx);
        });

        it('should add 0x prefix if missing', () => {
            const txWithout0x = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            expect(evmTransaction.parse(txWithout0x)).toBe(`0x${txWithout0x}`);
        });

        it('should reject invalid transaction hashes', () => {
            expect(() => evmTransaction.parse('0x123')).toThrow();
            expect(() => evmTransaction.parse('invalid')).toThrow();
        });
    });

    describe('svmAddress', () => {
        it('should validate correct SVM addresses', () => {
            const validAddress = 'So11111111111111111111111111111111111111112';
            expect(svmAddress.parse(validAddress)).toBe(validAddress);
        });

        it('should reject invalid SVM addresses', () => {
            expect(() => svmAddress.parse('invalid')).toThrow();
            expect(() => svmAddress.parse('0x1234567890abcdef')).toThrow();
            expect(() => svmAddress.parse('123')).toThrow();
        });
    });

    describe('svmTransaction', () => {
        it('should validate correct SVM transaction signatures', () => {
            const validSig = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';
            expect(svmTransaction.parse(validSig)).toBe(validSig);
        });

        it('should reject invalid SVM transaction signatures', () => {
            expect(() => svmTransaction.parse('invalid')).toThrow();
            expect(() => svmTransaction.parse('short')).toThrow();
        });
    });
});

describe('Network Schemas', () => {
    describe('evmNetworkIdSchema', () => {
        it('should accept valid EVM network IDs', () => {
            const result = evmNetworkIdSchema.parse('mainnet');
            expect(result).toBeDefined();
        });
    });

    describe('svmNetworkIdSchema', () => {
        it('should accept valid SVM network IDs', () => {
            const result = svmNetworkIdSchema.parse('solana');
            expect(result).toBeDefined();
        });
    });
});

describe('Protocol Schemas', () => {
    describe('evmProtocolSchema', () => {
        it('should accept valid protocols', () => {
            expect(evmProtocolSchema.parse('uniswap_v2')).toBe('uniswap_v2');
            expect(evmProtocolSchema.parse('uniswap_v3')).toBe('uniswap_v3');
            expect(evmProtocolSchema.parse('uniswap_v4')).toBe('uniswap_v4');
        });

        it('should reject invalid protocols', () => {
            expect(() => evmProtocolSchema.parse('invalid')).toThrow();
        });
    });

    describe('svmProtocolSchema', () => {
        it('should accept valid protocols', () => {
            expect(svmProtocolSchema.parse('raydium_amm_v4')).toBe('raydium_amm_v4');
        });

        it('should reject invalid protocols', () => {
            expect(() => svmProtocolSchema.parse('invalid')).toThrow();
        });
    });
});

describe('Common Query Parameter Schemas', () => {
    describe('limitSchema', () => {
        it('should parse valid limits', () => {
            expect(limitSchema.parse(10)).toBe(10);
            expect(limitSchema.parse('25')).toBe(25);
        });

        it('should use default value', () => {
            const result = limitSchema.parse(undefined);
            expect(result).toBeGreaterThan(0);
        });

        it('should reject invalid limits', () => {
            expect(() => limitSchema.parse(0)).toThrow();
            expect(() => limitSchema.parse(-1)).toThrow();
            expect(() => limitSchema.parse(10000000)).toThrow();
        });
    });

    describe('pageSchema', () => {
        it('should parse valid page numbers', () => {
            expect(pageSchema.parse(1)).toBe(1);
            expect(pageSchema.parse('5')).toBe(5);
        });

        it('should use default value', () => {
            expect(pageSchema.parse(undefined)).toBe(1);
        });

        it('should reject invalid page numbers', () => {
            expect(() => pageSchema.parse(0)).toThrow();
            expect(() => pageSchema.parse(-1)).toThrow();
        });
    });

    describe('intervalSchema', () => {
        it('should transform intervals to minutes', () => {
            expect(intervalSchema.parse('1h')).toBe(60);
            expect(intervalSchema.parse('4h')).toBe(240);
            expect(intervalSchema.parse('1d')).toBe(1440);
            expect(intervalSchema.parse('1w')).toBe(10080);
        });

        it('should reject invalid intervals', () => {
            expect(() => intervalSchema.parse('invalid')).toThrow();
        });
    });

    describe('timestampSchema', () => {
        it('should parse UNIX timestamps', () => {
            expect(timestampSchema.parse(1735689600)).toBe(1735689600);
            expect(timestampSchema.parse('1735689600')).toBe(1735689600);
        });

        it('should parse date strings', () => {
            const result = timestampSchema.parse('2025-01-01T00:00:00Z');
            expect(result).toBeGreaterThan(0);
        });

        it('should reject invalid timestamps', () => {
            expect(() => timestampSchema.parse(-1)).toThrow();
            expect(() => timestampSchema.parse('invalid date')).toThrow();
        });
    });

    describe('blockNumberSchema', () => {
        it('should parse valid block numbers', () => {
            expect(blockNumberSchema.parse(12345)).toBe(12345);
            expect(blockNumberSchema.parse('67890')).toBe(67890);
        });

        it('should reject negative block numbers', () => {
            expect(() => blockNumberSchema.parse(-1)).toThrow();
        });
    });

    describe('includeNullBalancesSchema', () => {
        it('should accept valid boolean strings', () => {
            expect(includeNullBalancesSchema.parse('true')).toBe(true);
            expect(includeNullBalancesSchema.parse('false')).toBe(false);
        });

        it('should accept valid boolean values', () => {
            expect(includeNullBalancesSchema.parse(true)).toBe(true);
            expect(includeNullBalancesSchema.parse(false)).toBe(false);
        });

        it('should reject invalid values', () => {
            expect(() => includeNullBalancesSchema.parse('yes')).toThrow();
            expect(() => includeNullBalancesSchema.parse('1')).toThrow();
        });
    });
});

describe('NFT Schemas', () => {
    describe('nftTokenIdSchema', () => {
        it('should parse valid token IDs', () => {
            expect(nftTokenIdSchema.parse('5712')).toBe('5712');
            expect(nftTokenIdSchema.parse(12345)).toBe('12345');
        });

        it('should accept empty string', () => {
            expect(nftTokenIdSchema.parse('')).toBe('');
        });

        it('should reject invalid token IDs', () => {
            expect(() => nftTokenIdSchema.parse('abc')).toThrow();
        });
    });

    describe('nftTokenStandardSchema', () => {
        it('should accept valid token standards', () => {
            expect(nftTokenStandardSchema.parse('ERC721')).toBe('ERC721');
            expect(nftTokenStandardSchema.parse('ERC1155')).toBe('ERC1155');
        });

        it('should reject invalid standards', () => {
            expect(() => nftTokenStandardSchema.parse('ERC20')).toThrow();
        });
    });
});

describe('Composable Field Schemas', () => {
    describe('EVM schemas', () => {
        it('evmContractSchema should validate contracts', () => {
            const result = evmContractSchema.parse('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2');
            expect(result).toBe('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2');
        });

        it('evmAddressSchema should validate addresses', () => {
            const result = evmAddressSchema.parse('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
            expect(result).toBe('0xd8da6bf26964af9d7eed9e03e53415d37aa96045');
        });

        it('evmPoolSchema should accept both addresses and transactions', () => {
            const address = evmPoolSchema.parse('0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640');
            expect(address).toBe('0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640');
        });

        it('evmFactorySchema should validate factory addresses', () => {
            const result = evmFactorySchema.parse('0x1F98431c8aD98523631AE4a59f267346ea31F984');
            expect(result).toBe('0x1f98431c8ad98523631ae4a59f267346ea31f984');
        });

        it('evmTransactionSchema should validate transaction hashes', () => {
            const tx = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            expect(evmTransactionSchema.parse(tx)).toBe(tx);
        });
    });

    describe('SVM schemas', () => {
        it('svmAddressSchema should validate addresses', () => {
            const address = 'So11111111111111111111111111111111111111112';
            expect(svmAddressSchema.parse(address)).toBe(address);
        });

        it('svmOwnerSchema should validate owner addresses', () => {
            const owner = 'So11111111111111111111111111111111111111112';
            expect(svmOwnerSchema.parse(owner)).toBe(owner);
        });

        it('svmTokenAccountSchema should validate token accounts', () => {
            const account = '4ct7br2vTPzfdmY3S5HLtTxcGSBfn6pnw98hsS6v359A';
            expect(svmTokenAccountSchema.parse(account)).toBe(account);
        });

        it('svmMintSchema should validate mint addresses', () => {
            const mint = 'So11111111111111111111111111111111111111112';
            expect(svmMintSchema.parse(mint)).toBe(mint);
        });

        it('svmAuthoritySchema should validate authority addresses', () => {
            const authority = '3ucNos4NbumPLZNWztqGHNFFgkHeRMBQAVemeeomsUxv';
            expect(svmAuthoritySchema.parse(authority)).toBe(authority);
        });

        it('svmAmmSchema should validate AMM addresses', () => {
            const amm = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
            expect(svmAmmSchema.parse(amm)).toBe(amm);
        });

        it('svmAmmPoolSchema should validate AMM pool addresses', () => {
            const pool = '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2';
            expect(svmAmmPoolSchema.parse(pool)).toBe(pool);
        });

        it('svmTransactionSchema should validate transaction signatures', () => {
            const sig = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';
            expect(svmTransactionSchema.parse(sig)).toBe(sig);
        });

        it('svmProgramIdSchema should accept valid program IDs', () => {
            const programId = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
            expect(svmProgramIdSchema.parse(programId)).toBe(programId);
        });

        it('svmSPLTokenProgramIdSchema should accept valid SPL program IDs', () => {
            const programId = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
            expect(svmSPLTokenProgramIdSchema.parse(programId)).toBe(programId);
        });

        it('svmMetadataSchema should accept string, null, or undefined', () => {
            expect(svmMetadataSchema.parse('metadata')).toBe('metadata');
            expect(svmMetadataSchema.parse(null)).toBe(null);
            const result = svmMetadataSchema.parse(undefined);
            expect(result).toBeUndefined();
        });
    });
});

describe('Response Schemas', () => {
    describe('evmTokenResponseSchema', () => {
        it('should validate token response objects', () => {
            const token = {
                address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                symbol: 'WETH',
                decimals: 18,
            };
            const result = evmTokenResponseSchema.parse(token);
            expect(result.symbol).toBe('WETH');
            expect(result.decimals).toBe(18);
        });
    });

    describe('svmMintResponseSchema', () => {
        it('should validate mint response objects', () => {
            const mint = {
                address: 'So11111111111111111111111111111111111111112',
                decimals: 9,
            };
            const result = svmMintResponseSchema.parse(mint);
            expect(result.decimals).toBe(9);
        });
    });

    describe('paginationQuerySchema', () => {
        it('should parse pagination parameters', () => {
            const result = paginationQuerySchema.parse({ limit: 10, page: 2 });
            expect(result.limit).toBe(10);
            expect(result.page).toBe(2);
        });

        it('should use defaults when not provided', () => {
            const result = paginationQuerySchema.parse({});
            expect(result.limit).toBeGreaterThan(0);
            expect(result.page).toBe(1);
        });
    });

    describe('statisticsResponseSchema', () => {
        it('should validate statistics objects', () => {
            const stats = {
                elapsed: 0.188,
                rows_read: 1090000,
                bytes_read: 88280000,
            };
            const result = statisticsResponseSchema.parse(stats);
            expect(result.elapsed).toBe(0.188);
        });

        it('should allow optional fields', () => {
            const result = statisticsResponseSchema.parse({});
            expect(result).toBeDefined();
        });
    });

    describe('paginationResponseSchema', () => {
        it('should validate pagination response objects', () => {
            const pagination = {
                previous_page: 1,
                current_page: 2,
            };
            const result = paginationResponseSchema.parse(pagination);
            expect(result.current_page).toBe(2);
        });
    });

    describe('apiUsageResponseSchema', () => {
        it('should validate complete API response objects', () => {
            const response = {
                data: [{ id: 1 }],
                statistics: { elapsed: 0.1 },
                pagination: { previous_page: 1, current_page: 1 },
                results: 1,
                request_time: new Date(),
                duration_ms: 100,
            };
            const result = apiUsageResponseSchema.parse(response);
            expect(result.results).toBe(1);
            expect(result.duration_ms).toBe(100);
        });
    });
});

describe('Error Response Schemas', () => {
    describe('clientErrorResponseSchema', () => {
        it('should validate client error responses', () => {
            const error = {
                status: 400,
                code: 'bad_query_input',
                message: 'Invalid input',
            };
            const result = clientErrorResponseSchema.parse(error);
            expect(result.status).toBe(400);
            expect(result.code).toBe('bad_query_input');
        });

        it('should accept all client error codes', () => {
            const codes = ['authentication_failed', 'bad_header', 'forbidden', 'not_found_data'];
            for (const code of codes) {
                const error = { status: 400, code, message: 'Error' };
                expect(() => clientErrorResponseSchema.parse(error)).not.toThrow();
            }
        });
    });

    describe('serverErrorResponseSchema', () => {
        it('should validate server error responses', () => {
            const error = {
                status: 500,
                code: 'internal_server_error',
                message: 'Server error',
            };
            const result = serverErrorResponseSchema.parse(error);
            expect(result.status).toBe(500);
        });
    });

    describe('apiErrorResponseSchema', () => {
        it('should accept both client and server errors', () => {
            const clientError = { status: 400, code: 'bad_query_input', message: 'Error' };
            const serverError = { status: 500, code: 'internal_server_error', message: 'Error' };

            expect(() => apiErrorResponseSchema.parse(clientError)).not.toThrow();
            expect(() => apiErrorResponseSchema.parse(serverError)).not.toThrow();
        });
    });
});

describe('createQuerySchema', () => {
    describe('basic functionality', () => {
        it('should create a query schema with required fields', () => {
            const schema = createQuerySchema(
                {
                    network: { schema: svmNetworkIdSchema },
                },
                false
            );

            const result = schema.parse({ network: 'solana' });
            expect(result.network).toBe('solana');
        });

        it('should reject missing required fields', () => {
            const schema = createQuerySchema(
                {
                    owner: { schema: svmOwnerSchema },
                },
                false
            );

            expect(() => schema.parse({})).toThrow('owner is required');
        });

        it('should allow optional fields with defaults', () => {
            const schema = createQuerySchema(
                {
                    include_null_balances: { schema: includeNullBalancesSchema, default: 'false' },
                },
                false
            );

            const result = schema.parse({});
            expect(result.include_null_balances).toBe('false');
        });
    });

    describe('batched fields', () => {
        it('should accept single values for batched fields', () => {
            const schema = createQuerySchema(
                {
                    owner: { schema: svmOwnerSchema, batched: true },
                },
                false
            );

            const result = schema.parse({ owner: 'So11111111111111111111111111111111111111112' });
            expect(Array.isArray(result.owner)).toBe(true);
            expect(result.owner[0]).toBe('So11111111111111111111111111111111111111112');
        });

        it('should accept comma-separated values for batched fields', () => {
            const schema = createQuerySchema(
                {
                    owner: { schema: svmOwnerSchema, batched: true },
                },
                false
            );

            const result = schema.parse({
                owner: 'So11111111111111111111111111111111111111112,4ct7br2vTPzfdmY3S5HLtTxcGSBfn6pnw98hsS6v359A',
            });
            expect(result.owner).toHaveLength(2);
        });

        it('should accept arrays for batched fields', () => {
            const schema = createQuerySchema(
                {
                    owner: { schema: svmOwnerSchema, batched: true },
                },
                false
            );

            const result = schema.parse({
                owner: ['So11111111111111111111111111111111111111112', '4ct7br2vTPzfdmY3S5HLtTxcGSBfn6pnw98hsS6v359A'],
            });
            expect(result.owner).toHaveLength(2);
        });

        it('should validate each item in batched fields', () => {
            const schema = createQuerySchema(
                {
                    owner: { schema: svmOwnerSchema, batched: true },
                },
                false
            );

            expect(() => schema.parse({ owner: 'invalid,So11111111111111111111111111111111111111112' })).toThrow();
        });
    });

    describe('pagination', () => {
        it('should include pagination when include_pagination is true', () => {
            const schema = createQuerySchema({
                network: { schema: svmNetworkIdSchema },
            });

            const result = schema.parse({ network: 'solana', limit: 25, page: 2 });
            expect(result.limit).toBe(25);
            expect(result.page).toBe(2);
        });

        it('should not include pagination when include_pagination is false', () => {
            const schema = createQuerySchema(
                {
                    network: { schema: svmNetworkIdSchema },
                },
                false
            );

            const result = schema.parse({ network: 'solana' });
            expect('limit' in result).toBe(false);
            expect('page' in result).toBe(false);
        });
    });

    describe('complex query schema', () => {
        it('should handle mixed required and optional fields', () => {
            const schema = createQuerySchema({
                network: { schema: svmNetworkIdSchema },
                owner: { schema: svmOwnerSchema, batched: true },
                token_account: { schema: svmTokenAccountSchema, batched: true, default: '' },
                include_null_balances: { schema: includeNullBalancesSchema, default: 'false' },
            });

            const result = schema.parse({
                network: 'solana',
                owner: 'So11111111111111111111111111111111111111112',
            });

            expect(result.network).toBe('solana');
            expect(Array.isArray(result.owner)).toBe(true);
            expect(result.token_account).toEqual(['']);
            expect(result.include_null_balances).toBe('false');
        });
    });

    describe('custom separators', () => {
        it('should support custom separators for batched fields', () => {
            const schema = createQuerySchema(
                {
                    owner: { schema: svmOwnerSchema, batched: true, separator: '|' },
                },
                false
            );

            const result = schema.parse({
                owner: 'So11111111111111111111111111111111111111112|4ct7br2vTPzfdmY3S5HLtTxcGSBfn6pnw98hsS6v359A',
            });
            expect(result.owner).toHaveLength(2);
        });
    });

    describe('error messages', () => {
        it('should provide clear error messages for missing required fields', () => {
            const schema = createQuerySchema(
                {
                    owner: { schema: svmOwnerSchema, batched: true },
                    mint: { schema: svmMintSchema, batched: true },
                },
                false
            );

            try {
                schema.parse({ mint: 'So11111111111111111111111111111111111111112' });
                expect(true).toBe(false); // Should not reach here
            } catch (error) {
                if (error instanceof z.ZodError) {
                    expect(error.issues?.[0]?.message).toContain('owner is required');
                }
            }
        });

        it('should provide validation errors for invalid values', () => {
            const schema = createQuerySchema(
                {
                    owner: { schema: svmOwnerSchema },
                },
                false
            );

            expect(() => schema.parse({ owner: 'invalid' })).toThrow('Invalid SVM address');
        });
    });
});
