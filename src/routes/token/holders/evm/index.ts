import { Context } from "hono";

export default async function (ctx: Context) {
    return ctx.json({to: "do"});
}