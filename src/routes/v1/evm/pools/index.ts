import { Hono } from 'hono';
import evm from './evm.js';
import ohlc from './ohlc/index.js';

const router = new Hono();

router.route('/', evm);
router.route('/ohlc', ohlc);

export default router;
