// example1.test.js
import { it, expect } from "bun:test";
import { parseEvmAddress } from "./valibot.js";

it("parseEvmAddress", () => {
  expect(parseEvmAddress("0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5")).toBe("95222290dd7278aa3ddd389cc1e1d165cc4bafe5");
  expect(parseEvmAddress("0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5")).toBe("95222290dd7278aa3ddd389cc1e1d165cc4bafe5");
  expect(parseEvmAddress("95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5")).toBe("95222290dd7278aa3ddd389cc1e1d165cc4bafe5");
  expect(parseEvmAddress("abc")).toBe(null);
  expect(parseEvmAddress("0xabc")).toBe(null);
  expect(parseEvmAddress("")).toBe(null);
});
