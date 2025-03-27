import { Hono } from 'hono';
import prices from "./prices/index.js";

const router = new Hono();

router.route('/prices', prices);

export default router;
