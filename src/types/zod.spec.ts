import { describe, expect, it } from 'bun:test';
import { ZodError } from 'zod';
import { config } from '../config.js';
import {
    EVM_networkIdSchema,
    evmAddressSchema,
    evmTransactionSchema,
    paginationSchema,
    timestampSchema,
} from './zod.js';

describe('EVM Address Schema', () => {
    it('should correctly parse a valid lowercase address', () => {
        const address = '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5';
        expect(evmAddressSchema.parse(address)).toBe(address);
    });

    it('should convert a valid mixed-case address to lowercase', () => {
        const expected = '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5';
        expect(evmAddressSchema.parse('0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5')).toBe(expected);
    });

    it('should correctly parse an address missing the 0x prefix', () => {
        const expected = '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5';
        expect(evmAddressSchema.parse('95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5')).toBe(expected);
    });

    it("should throw a ZodError when parsing an invalid address string 'abc'", () => {
        expect(() => evmAddressSchema.parse('abc')).toThrowError(ZodError);
    });

    it("should throw a ZodError when parsing a too-short address '0xabc'", () => {
        expect(() => evmAddressSchema.parse('0xabc')).toThrowError(ZodError);
    });

    it('should parse an empty string and return empty string', () => {
        expect(evmAddressSchema.parse('')).toBe('');
    });

    it('should throw a ZodError when parsing undefined', () => {
        expect(() => evmAddressSchema.parse(undefined)).toThrowError(ZodError);
    });
});

describe('EVM Transaction Schema', () => {
    it('should correctly parse a valid lowercase transaction', () => {
        const tx = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
        expect(evmTransactionSchema.parse(tx)).toBe(tx);
    });

    it('should convert a valid mixed-case transaction to lowercase', () => {
        const expected = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
        expect(evmTransactionSchema.parse('0x1234567890ABCDEF1234567890abcdef1234567890ABCDEF1234567890abcdef')).toBe(
            expected
        );
    });

    it('should correctly parse a transaction missing the 0x prefix', () => {
        const expected = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
        expect(evmTransactionSchema.parse('1234567890ABCDEF1234567890abcdef1234567890ABCDEF1234567890abcdef')).toBe(
            expected
        );
    });

    it("should throw a ZodError when parsing an invalid transaction string 'abc'", () => {
        expect(() => evmTransactionSchema.parse('abc')).toThrowError(ZodError);
    });

    it("should throw a ZodError when parsing a too-short transaction '0xabc'", () => {
        expect(() => evmTransactionSchema.parse('0xabc')).toThrowError(ZodError);
    });

    it('should parse an empty string and return empty string', () => {
        expect(evmTransactionSchema.parse('')).toBe('');
    });

    it('should throw a ZodError when parsing undefined', () => {
        expect(() => evmTransactionSchema.parse(undefined)).toThrowError(ZodError);
    });
});

describe('Pagination Schema', () => {
    it('should validate a pagination object with multiple pages correctly', () => {
        expect(() =>
            paginationSchema.parse({
                previous_page: 1,
                current_page: 1,
                next_page: 2,
                total_pages: 3,
            })
        ).not.toThrow();
    });

    it('should validate a pagination object when there is only one page', () => {
        expect(() =>
            paginationSchema.parse({
                previous_page: 1,
                current_page: 1,
                next_page: 1,
                total_pages: 1,
            })
        ).not.toThrow();
    });

    it('should throw a ZodError if previous_page is less than 1', () => {
        expect(() =>
            paginationSchema.parse({
                previous_page: 0,
                current_page: 1,
                next_page: 2,
                total_pages: 3,
            })
        ).toThrowError(ZodError);
    });

    it('should throw a ZodError if current_page is less than 1', () => {
        expect(() =>
            paginationSchema.parse({
                previous_page: 1,
                current_page: 0,
                next_page: 2,
                total_pages: 3,
            })
        ).toThrowError(ZodError);
    });

    it('should throw a ZodError if next_page is less than 1', () => {
        expect(() =>
            paginationSchema.parse({
                previous_page: 1,
                current_page: 1,
                next_page: 0,
                total_pages: 3,
            })
        ).toThrowError(ZodError);
    });

    it('should throw a ZodError if total_pages is less than 1', () => {
        expect(() =>
            paginationSchema.parse({
                previous_page: 1,
                current_page: 1,
                next_page: 2,
                total_pages: 0,
            })
        ).toThrowError(ZodError);
    });

    it('should throw a ZodError when previous_page is greater than current_page', () => {
        expect(() =>
            paginationSchema.parse({
                previous_page: 2,
                current_page: 1,
                next_page: 2,
                total_pages: 3,
            })
        ).toThrowError(ZodError);
    });

    it('should throw a ZodError when current_page is greater than next_page', () => {
        expect(() =>
            paginationSchema.parse({
                previous_page: 1,
                current_page: 3,
                next_page: 2,
                total_pages: 3,
            })
        ).toThrowError(ZodError);
    });

    it('should throw a ZodError when next_page is greater than total_pages', () => {
        expect(() =>
            paginationSchema.parse({
                previous_page: 1,
                current_page: 1,
                next_page: 3,
                total_pages: 2,
            })
        ).toThrowError(ZodError);
    });
});

describe('Timestamp Schema', () => {
    it('should accept a valid timestamp number', () => {
        const timestamp = 1647456789; // seconds as number
        expect(timestampSchema.parse(timestamp)).toBe(1647456789); // returns original value
    });

    it('should handle zero as a valid timestamp', () => {
        expect(timestampSchema.parse(0)).toBe(0);
    });

    it('should throw a ZodError for negative timestamps', () => {
        expect(() => timestampSchema.parse(-1)).toThrowError(ZodError);
    });

    it('should accept string inputs and coerce them to numbers', () => {
        expect(timestampSchema.parse('1647456789')).toBe(1647456789);
        expect(timestampSchema.parse('0')).toBe(0);
    });

    it('should throw a ZodError for non-numeric strings', () => {
        expect(() => timestampSchema.parse('abc')).toThrowError(ZodError);
        // Empty string coerces to 0, so it doesn't throw
        expect(timestampSchema.parse('')).toBe(0);
        expect(() => timestampSchema.parse('123abc')).toThrowError(ZodError);
    });

    it('should throw ZodError for decimal strings (integer validation)', () => {
        // .int() validation fails for decimals even after coercion
        expect(() => timestampSchema.parse('1647456789.5')).toThrowError(ZodError);
        expect(() => timestampSchema.parse('128.9')).toThrowError(ZodError);
    });

    it('should throw ZodError for decimal numbers (integer validation)', () => {
        // .int() validation fails for decimals
        expect(() => timestampSchema.parse(1647456789.5)).toThrowError(ZodError);
        expect(() => timestampSchema.parse(128.9)).toThrowError(ZodError);
        expect(() => timestampSchema.parse(6.1)).toThrowError(ZodError);
    });

    it('should accept valid integer numbers', () => {
        expect(timestampSchema.parse(1)).toBe(1);
        expect(timestampSchema.parse(128)).toBe(128);
        expect(timestampSchema.parse(2147483647)).toBe(2147483647);
    });

    it('should handle the safeParse method correctly', () => {
        const validResult = timestampSchema.safeParse(1647456789);
        expect(validResult.success).toBe(true);
        if (validResult.success) {
            expect(validResult.data).toBe(1647456789);
        }

        const validStringResult = timestampSchema.safeParse('1647456789');
        expect(validStringResult.success).toBe(true);
        if (validStringResult.success) {
            expect(validStringResult.data).toBe(1647456789);
        }

        const invalidResult = timestampSchema.safeParse(-1);
        expect(invalidResult.success).toBe(false);

        const invalidFloatResult = timestampSchema.safeParse(1647456789.5);
        expect(invalidFloatResult.success).toBe(false);
        if (!invalidFloatResult.success && invalidFloatResult.error.issues[0]) {
            expect(invalidFloatResult.error.issues[0].message).toContain('Expected integer');
        }

        const invalidStringResult = timestampSchema.safeParse('abc');
        expect(invalidStringResult.success).toBe(false);
        if (!invalidStringResult.success && invalidStringResult.error.issues[0]) {
            expect(invalidStringResult.error.issues[0].message).toContain('Expected number');
        }
    });

    it('should accept large valid timestamps within safe integer range', () => {
        const largeTimestamp = 9999999999; // Year 2286 - this works fine
        expect(timestampSchema.parse(largeTimestamp)).toBe(largeTimestamp);

        // Use a large but reasonable timestamp instead of MAX_SAFE_INTEGER
        // This represents a date in the year 33658 CE, which is still valid for JS Date
        const veryLargeButValidTimestamp = 999999999999; // Still creates valid Date
        expect(timestampSchema.parse(veryLargeButValidTimestamp)).toBe(veryLargeButValidTimestamp);
    });

    it('should throw for timestamps that would create invalid dates', () => {
        // Test with a timestamp that's too large for JavaScript Date
        // MAX_SAFE_INTEGER * 1000 creates an invalid date
        expect(() => timestampSchema.parse(Number.MAX_SAFE_INTEGER)).toThrow('Invalid timestamp');
    });

    it('should handle edge cases with safeParse', () => {
        // Valid: large but safe integer
        const validResult = timestampSchema.safeParse(9999999999);
        expect(validResult.success).toBe(true);
        if (validResult.success) {
            expect(validResult.data).toBe(9999999999);
        }

        // Invalid: negative number
        const invalidResult = timestampSchema.safeParse(-1);
        expect(invalidResult.success).toBe(false);
        if (!invalidResult.success && invalidResult.error.issues[0]) {
            expect(invalidResult.error.issues[0].message).toContain(
                'Timestamp must be a valid UNIX timestamp in seconds'
            );
        }

        // Invalid: timestamp that creates invalid date - use safeParse to avoid throwing
        const invalidDateResult = timestampSchema.safeParse(Number.MAX_SAFE_INTEGER);
        expect(invalidDateResult.success).toBe(false);
    });

    it('should handle boolean and special value coercion', () => {
        // z.coerce.number() converts these
        expect(timestampSchema.parse(true)).toBe(1);
        expect(timestampSchema.parse(false)).toBe(0);

        // null coerces to 0, doesn't throw
        expect(timestampSchema.parse(null)).toBe(0);
        // undefined does throw
        expect(() => timestampSchema.parse(undefined)).toThrowError(ZodError);
    });
});

describe.skip('EVM Network ID Schema', () => {
    it('should accept the default network ID', () => {
        expect(EVM_networkIdSchema.parse(config.defaultEvmNetwork)).toBe(config.defaultEvmNetwork);
    });

    it('should accept any network ID from the config', () => {
        for (const network of config.networks) {
            expect(EVM_networkIdSchema.parse(network)).toBe(network);
        }
    });

    it('should throw a ZodError for network IDs not in the config', () => {
        expect(() => EVM_networkIdSchema.parse('invalid-network')).toThrowError(ZodError);
    });

    it('should throw a ZodError for empty strings', () => {
        expect(() => EVM_networkIdSchema.parse('')).toThrowError(ZodError);
    });

    it('should throw a ZodError for non-string values', () => {
        expect(() => EVM_networkIdSchema.parse(123)).toThrowError(ZodError);
        expect(() => EVM_networkIdSchema.parse(null)).toThrowError(ZodError);
        expect(() => EVM_networkIdSchema.parse(undefined)).toThrowError(ZodError);
        expect(() => EVM_networkIdSchema.parse({})).toThrowError(ZodError);
    });

    it('should correctly handle the safeParse method', () => {
        const validResult = EVM_networkIdSchema.safeParse(config.defaultEvmNetwork);
        expect(validResult.success).toBe(true);
        if (validResult.success) {
            expect(validResult.data).toBe(config.defaultEvmNetwork);
        }

        const invalidResult = EVM_networkIdSchema.safeParse('invalid-network');
        expect(invalidResult.success).toBe(false);
    });

    it('should include the correct error message for invalid networks', () => {
        try {
            EVM_networkIdSchema.parse('invalid-network');
        } catch (error) {
            if (error instanceof ZodError) {
                // @ts-ignore
                const errorMessage = error.errors[0].message;
                expect(errorMessage).toContain('Invalid enum value');
                expect(errorMessage).toContain('Expected');
                // Check that the error message lists all valid networks
                for (const network of config.networks) {
                    expect(errorMessage).toContain(network);
                }
            }
        }
    });
});
