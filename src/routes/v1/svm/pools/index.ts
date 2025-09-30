import { Hono } from 'hono';
import ohlc from './ohlc/index.js';
import svm from './svm.js';

const router = new Hono();

router.route('/ohlc', ohlc);
router.route('/', svm);

export default router;
