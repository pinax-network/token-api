import { Hono } from 'hono';
import balances from './balances/index.js';
import dexes from './dexes/index.js';
import holders from './holders/index.js';
import nft from './nft/index.js';
import pools from './pools/index.js';
// import prices from './prices/index.js';
import swaps from './swaps/index.js';
import tokens from './tokens/index.js';
import transfers from './transfers/index.js';

const router = new Hono();

router.route('/balances', balances);
router.route('/dexes', dexes);
router.route('/holders', holders);
router.route('/nft', nft);
router.route('/pools', pools);
// router.route('/prices', prices);
router.route('/swaps', swaps);
router.route('/transfers', transfers);
router.route('/tokens', tokens);

export default router;
