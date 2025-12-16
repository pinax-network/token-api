import { Hono } from 'hono';
import tvm from './tvm.js';
import ohlc from './ohlc/index.js';

const router = new Hono();

router.route('/', tvm);
router.route('/ohlc', ohlc);

export default router;
