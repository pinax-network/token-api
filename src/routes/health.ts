import { Context } from "hono";
import client from "../clickhouse/client.js";
import { APIErrorResponse } from "../utils.js";

export default async function (ctx: Context) {
    const response = await client.ping();
    if (!response.success) {
        return APIErrorResponse(ctx, 500, "bad_database_response", response.error.message);
    }
    return new Response("OK");
}