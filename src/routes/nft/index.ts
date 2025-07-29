import { Hono } from 'hono';
import activities from './activities/index.js';
import collections_for_contract from './collections_for_contract/index.js';
import holders from './holders/index.js';
import items from './items/index.js';
import ownerships_for_account from './ownerships_for_account/index.js';
import sales from './sales/index.js';

const router = new Hono();

router.route('/ownerships', ownerships_for_account);
router.route('/collections', collections_for_contract);
router.route('/items', items);
router.route('/activities', activities);
router.route('/holders', holders);
router.route('/sales', sales);

export default router;
