import { PingResult } from "@clickhouse/client-web";
import client from "./client.js";
import { logger } from "../logger.js";

// Does not work with Bun's implementation of Node streams.
// export async function ping(): Promise<PingResult> {
//     try {
//         await client.exec({ query: "SELECT 1" });
//         logger.info("Successfully pinged database");
//         return { success: true };
//     } catch (err) {
//         const message = typeof err === "string" ? err : JSON.stringify(err);
//         return { success: false, error: new Error(message) };
//     }
// };