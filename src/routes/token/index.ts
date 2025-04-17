import { Hono } from 'hono';
import balances from "./balances/index.js";
import transfers from "./transfers/index.js";
import holders from "./holders/index.js";
import tokens from "./tokens/index.js";
import ohlc from "./ohlc/index.js";
import pools from "./pools/index.js";
import swaps from "./swaps/index.js";

const router = new Hono();

router.route('/balances', balances);
router.route('/transfers', transfers);
router.route('/holders', holders);
router.route('/tokens', tokens);
router.route('/ohlc', ohlc);
router.route('/pools', pools);
router.route('/swaps', swaps);

export default router;
