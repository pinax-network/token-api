// routes/index.ts
import { Hono } from 'hono';
import evm from './evm/index.js';
import health from './health.js';
import networks from './networks.js';
import svm from './svm/index.js';
import version from './version.js';

const router = new Hono();

router.route('/evm', evm);
router.route('/svm', svm);
router.route('/', health);
router.route('/', version);
router.route('/', networks);

export default router;
