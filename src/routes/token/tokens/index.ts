import { Hono } from 'hono';
import evm from './evm.js';

const router = new Hono();

router.route('/evm', evm);
// router.route('/svm', svm)

export default router;
