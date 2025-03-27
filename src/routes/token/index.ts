import { Hono } from 'hono';
import balances from "./balances/index.js";
import transfers from "./transfers/index.js";
import holders from "./holders/index.js";
import tokens from "./tokens/index.js";
import ohlc from "./ohlc/index.js";

const router = new Hono();

router.route('/balances', balances);
router.route('/transfers', transfers);
router.route('/holders', holders);
router.route('/tokens', tokens);
router.route('/ohlc', ohlc);

export default router;
