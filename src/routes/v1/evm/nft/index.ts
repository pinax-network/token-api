import { Hono } from 'hono';
import collections from './collections/index.js';
import holders from './holders/index.js';
import items from './items/index.js';
import ownerships from './ownerships/index.js';
import sales from './sales/index.js';
import transfers from './transfers/index.js';

const router = new Hono();

router.route('/collections', collections);
router.route('/holders', holders);
router.route('/items', items);
router.route('/ownerships', ownerships);
router.route('/sales', sales);
router.route('/transfers', transfers);

export default router;
