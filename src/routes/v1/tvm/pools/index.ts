import { Hono } from 'hono';
import ohlc from './ohlc/index.js';
import tvm from './tvm.js';

const router = new Hono();

router.route('/', tvm);
router.route('/ohlc', ohlc);

export default router;
