import { Hono } from 'hono';
import balances from './balances/index.js';
import historical from './historical/index.js';
import holders from './holders/index.js';
import ohlc from './ohlc/index.js';
import owner from './owner/index.js';
import pools from './pools/index.js';
import swaps from './swaps/index.js';
import tokens from './tokens/index.js';
import transfers from './transfers/index.js';

const router = new Hono();

router.route('/balances', balances);
router.route('/transfers', transfers);
router.route('/tokens', tokens);
router.route('/holders', holders);
router.route('/swaps', swaps);
router.route('/pools', pools);
router.route('/ohlc', ohlc);
router.route('/owner', owner);
router.route('/historical', historical);

export default router;
