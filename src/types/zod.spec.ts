import { describe, it, expect } from "bun:test";
import { evmAddressSchema, paginationSchema, timestampSchema, EVM_networkIdSchema } from "./zod.js";
import { ZodError } from "zod";
import { config } from "../config.js";

describe("EVM Address Schema", () => {
  it("should correctly parse a valid lowercase address", () => {
    const address = "0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5";
    expect(evmAddressSchema.parse(address)).toBe(address);
  });

  it("should convert a valid mixed-case address to lowercase", () => {
    const expected = "0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5";
    expect(
      evmAddressSchema.parse("0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5")
    ).toBe(expected);
  });

  it("should correctly parse an address missing the 0x prefix", () => {
    const expected = "0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5";
    expect(
      evmAddressSchema.parse("95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5")
    ).toBe(expected);
  });

  it("should throw a ZodError when parsing an invalid address string 'abc'", () => {
    expect(() => evmAddressSchema.parse("abc")).toThrowError(ZodError);
  });

  it("should throw a ZodError when parsing a too-short address '0xabc'", () => {
    expect(() => evmAddressSchema.parse("0xabc")).toThrowError(ZodError);
  });

  it("should throw a ZodError when parsing an empty string", () => {
    expect(() => evmAddressSchema.parse("")).toThrowError(ZodError);
  });
});

describe("Pagination Schema", () => {
  it("should validate a pagination object with multiple pages correctly", () => {
    expect(() =>
      paginationSchema.parse({
        previous_page: 1,
        current_page: 1,
        next_page: 2,
        total_pages: 3,
      })
    ).not.toThrow();
  });

  it("should validate a pagination object when there is only one page", () => {
    expect(() =>
      paginationSchema.parse({
        previous_page: 1,
        current_page: 1,
        next_page: 1,
        total_pages: 1,
      })
    ).not.toThrow();
  });

  it("should throw a ZodError if previous_page is less than 1", () => {
    expect(() =>
      paginationSchema.parse({
        previous_page: 0,
        current_page: 1,
        next_page: 2,
        total_pages: 3,
      })
    ).toThrowError(ZodError);
  });

  it("should throw a ZodError if current_page is less than 1", () => {
    expect(() =>
      paginationSchema.parse({
        previous_page: 1,
        current_page: 0,
        next_page: 2,
        total_pages: 3,
      })
    ).toThrowError(ZodError);
  });

  it("should throw a ZodError if next_page is less than 1", () => {
    expect(() =>
      paginationSchema.parse({
        previous_page: 1,
        current_page: 1,
        next_page: 0,
        total_pages: 3,
      })
    ).toThrowError(ZodError);
  });

  it("should throw a ZodError if total_pages is less than 1", () => {
    expect(() =>
      paginationSchema.parse({
        previous_page: 1,
        current_page: 1,
        next_page: 2,
        total_pages: 0,
      })
    ).toThrowError(ZodError);
  });

  it("should throw a ZodError when previous_page is greater than current_page", () => {
    expect(() =>
      paginationSchema.parse({
        previous_page: 2,
        current_page: 1,
        next_page: 2,
        total_pages: 3,
      })
    ).toThrowError(ZodError);
  });

  it("should throw a ZodError when current_page is greater than next_page", () => {
    expect(() =>
      paginationSchema.parse({
        previous_page: 1,
        current_page: 3,
        next_page: 2,
        total_pages: 3,
      })
    ).toThrowError(ZodError);
  });

  it("should throw a ZodError when next_page is greater than total_pages", () => {
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

describe("Timestamp Schema", () => {
  it("should convert a valid timestamp number to milliseconds", () => {
    const timestamp = 1647456789; // seconds
    expect(timestampSchema.parse(timestamp)).toBe(1647456789000); // milliseconds
  });

  it("should coerce string timestamps to numbers and convert to milliseconds", () => {
    const timestampStr = "1647456789"; // seconds as string
    expect(timestampSchema.parse(timestampStr)).toBe(1647456789000); // milliseconds
  });

  it("should handle zero as a valid timestamp", () => {
    expect(timestampSchema.parse(0)).toBe(0);
    expect(timestampSchema.parse("0")).toBe(0);
    expect(timestampSchema.parse("")).toBe(0);
  });

  it("should throw a ZodError for negative timestamps", () => {
    expect(() => timestampSchema.parse(-1)).toThrowError(ZodError);
    expect(() => timestampSchema.parse("-1")).toThrowError(ZodError);
  });

  it("should throw a ZodError for non-numeric strings", () => {
    expect(() => timestampSchema.parse("abc")).toThrowError(ZodError);
  });

  it("should correctly validate and transform decimal timestamps", () => {
    expect(timestampSchema.parse(1647456789.5)).toBe(1647456789500);
    expect(timestampSchema.parse("1647456789.5")).toBe(1647456789500);
  });

  it("should handle the safeParse method correctly", () => {
    const validResult = timestampSchema.safeParse(1647456789);
    expect(validResult.success).toBe(true);
    if (validResult.success) {
      expect(validResult.data).toBe(1647456789000);
    }

    const invalidResult = timestampSchema.safeParse(-1);
    expect(invalidResult.success).toBe(false);
  });
});

describe.skip("EVM Network ID Schema", () => {
  it("should accept the default network ID", () => {
    expect(EVM_networkIdSchema.parse(config.defaultEvmNetwork)).toBe(config.defaultEvmNetwork);
  });

  it("should accept any network ID from the config", () => {
    for (const network of config.networks) {
      expect(EVM_networkIdSchema.parse(network)).toBe(network);
    }
  });

  it("should throw a ZodError for network IDs not in the config", () => {
    expect(() => EVM_networkIdSchema.parse("invalid-network")).toThrowError(ZodError);
  });

  it("should throw a ZodError for empty strings", () => {
    expect(() => EVM_networkIdSchema.parse("")).toThrowError(ZodError);
  });

  it("should throw a ZodError for non-string values", () => {
    expect(() => EVM_networkIdSchema.parse(123)).toThrowError(ZodError);
    expect(() => EVM_networkIdSchema.parse(null)).toThrowError(ZodError);
    expect(() => EVM_networkIdSchema.parse(undefined)).toThrowError(ZodError);
    expect(() => EVM_networkIdSchema.parse({})).toThrowError(ZodError);
  });

  it("should correctly handle the safeParse method", () => {
    const validResult = EVM_networkIdSchema.safeParse(config.defaultEvmNetwork);
    expect(validResult.success).toBe(true);
    if (validResult.success) {
      expect(validResult.data).toBe(config.defaultEvmNetwork);
    }

    const invalidResult = EVM_networkIdSchema.safeParse("invalid-network");
    expect(invalidResult.success).toBe(false);
  });

  it("should include the correct error message for invalid networks", () => {
    try {
      EVM_networkIdSchema.parse("invalid-network");
    } catch (error) {
      if (error instanceof ZodError) {
        // @ts-ignore
        const errorMessage = error.errors[0].message;
        expect(errorMessage).toContain("Invalid enum value");
        expect(errorMessage).toContain("Expected");
        // Check that the error message lists all valid networks
        for (const network of config.networks) {
          expect(errorMessage).toContain(network);
        }
      }
    }
  });
});
