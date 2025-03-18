// example1.test.js
import { it, expect } from "bun:test";
import { chainIdSchema, evmAddressSchema } from "./zod.js";
import { ZodError } from "zod";

it("evmAddressSchema", () => {
    expect(evmAddressSchema.parse("0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5")).toBe("0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5");
    expect(evmAddressSchema.parse("0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5")).toBe("0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5");
    expect(evmAddressSchema.parse("95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5")).toBe("0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5");
    expect(() => evmAddressSchema.parse("abc")).toThrowError(ZodError);
    expect(() => evmAddressSchema.parse("0xabc")).toThrowError(ZodError);
    expect(() => evmAddressSchema.parse("")).toThrowError(ZodError);
});

it("chainIdSchema", () => {
    expect(chainIdSchema.parse("mainnet")).toBe("mainnet");
    expect(() => chainIdSchema.parse("invalid")).toThrowError(ZodError);
});