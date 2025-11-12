import type { Context } from 'hono';
import { z } from 'zod';
import { booleanFromString } from '../../types/zod.js';
import { MonitorService } from '../services/monitorService.js';

export class MonitorController {
    public readonly healthQuerySchema = z.object({
        skip_endpoints: booleanFromString.default(true).optional(),
    });

    constructor(private readonly service: MonitorService) {}

    public healthHandler() {
        return async (ctx: Context) => {
            const raw = (ctx.req as unknown as { valid?: (key: string) => unknown }).valid?.('query');
            const params = this.healthQuerySchema.parse(raw ?? ctx.req.query());
            const result = await this.service.evaluateHealth(params.skip_endpoints ?? true);
            const status = result.status === 'unhealthy' ? 503 : 200;

            ctx.header('Cache-Control', 'no-cache, no-store, must-revalidate');
            ctx.header('Pragma', 'no-cache');
            ctx.header('Expires', '0');

            return ctx.json(result, status);
        };
    }

    public versionHandler() {
        return async (ctx: Context) => {
            return ctx.json(this.service.getVersionInfo());
        };
    }

    public networksHandler() {
        return async (ctx: Context) => {
            return ctx.json({ networks: this.service.getNetworks() });
        };
    }

    public getNetwork(id: string) {
        return this.service.getNetwork(id);
    }
}
