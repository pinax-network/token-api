import { describe, it, expect } from "bun:test";
import { networkIdSchema, evmAddressSchema, paginationSchema } from "./zod.js";
import { ZodError } from "zod";

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

describe("Network ID Schema", () => {
  it("should successfully parse a valid network ID 'mainnet'", () => {
    expect(networkIdSchema.parse("mainnet")).toBe("mainnet");
  });

  it("should throw a ZodError when parsing an invalid network ID", () => {
    expect(() => networkIdSchema.parse("invalid")).toThrowError(ZodError);
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