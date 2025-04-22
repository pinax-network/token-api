import { Hono } from 'hono';
import pools from "./pools/index.js";
import prices from "./prices/index.js";

const router = new Hono();

router.route('/pools', pools);
router.route('/prices', prices);

export default router;
