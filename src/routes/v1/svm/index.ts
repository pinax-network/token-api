import { Hono } from 'hono';
import balances from './balances/index.js';
import dexes from './dexes/index.js';
import holders from './holders/index.js';
import owner from './owner/index.js';
import pools from './pools/index.js';
import swaps from './swaps/index.js';
import tokens from './tokens/index.js';
import transfers from './transfers/index.js';

const router = new Hono();

router.route('/balances', balances);
router.route('/dexes', dexes);
router.route('/holders', holders);
router.route('/owner', owner);
router.route('/pools', pools);
router.route('/swaps', swaps);
router.route('/tokens', tokens);
router.route('/transfers', transfers);

export default router;
