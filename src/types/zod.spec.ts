// example1.test.js
import { it, expect } from "bun:test";
import { networkIdSchema, evmAddressSchema, paginationSchema } from "./zod.js";
import { ZodError } from "zod";

it("evmAddressSchema", () => {
    expect(evmAddressSchema.parse("0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5")).toBe("0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5");
    expect(evmAddressSchema.parse("0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5")).toBe("0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5");
    expect(evmAddressSchema.parse("95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5")).toBe("0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5");
    expect(() => evmAddressSchema.parse("abc")).toThrowError(ZodError);
    expect(() => evmAddressSchema.parse("0xabc")).toThrowError(ZodError);
    expect(() => evmAddressSchema.parse("")).toThrowError(ZodError);
});

it("networkIdSchema", () => {
    expect(networkIdSchema.parse("mainnet")).toBe("mainnet");
    expect(() => networkIdSchema.parse("invalid")).toThrowError(ZodError);
});

it("paginationSchema", () => {
    expect(() => paginationSchema.parse({
        previous_page: 1,
        current_page: 1,
        next_page: 2,
        total_pages: 3,
    })).not.toThrow();

    // OK only one page
    expect(() => paginationSchema.parse({
        previous_page: 1,
        current_page: 1,
        next_page: 1,
        total_pages: 1,
    })).not.toThrow();

    // Invalid, 0 page
    expect(() => paginationSchema.parse({
        previous_page: 0,
        current_page: 1,
        next_page: 2,
        total_pages: 3,
    })).toThrowError(ZodError);

    // Invalid, 0 page
    expect(() => paginationSchema.parse({
        previous_page: 1,
        current_page: 0,
        next_page: 2,
        total_pages: 3,
    })).toThrowError(ZodError);

    // Invalid, 0 page
    expect(() => paginationSchema.parse({
        previous_page: 1,
        current_page: 1,
        next_page: 0,
        total_pages: 3,
    })).toThrowError(ZodError);

    // Invalid, 0 page
    expect(() => paginationSchema.parse({
        previous_page: 1,
        current_page: 1,
        next_page: 2,
        total_pages: 0,
    })).toThrowError(ZodError);

    // Invalid, previous > current
    expect(() => paginationSchema.parse({
        previous_page: 2,
        current_page: 1,
        next_page: 2,
        total_pages: 3,
    })).toThrowError(ZodError);

    // Invalid, current > next
    expect(() => paginationSchema.parse({
        previous_page: 1,
        current_page: 3,
        next_page: 2,
        total_pages: 3,
    })).toThrowError(ZodError);

    // Invalid, next > total
    expect(() => paginationSchema.parse({
        previous_page: 1,
        current_page: 1,
        next_page: 3,
        total_pages: 2,
    })).toThrowError(ZodError);
});