import { Hono } from 'hono';
import evm from './evm.js';

const router = new Hono();

router.route('/ohlc', evm);

export default router;
