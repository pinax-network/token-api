import { Hono } from 'hono';
import historical from './historical/index.js';
import native from './native/index.js';
import tvm from './tvm.js';

const router = new Hono();

router.route('/historical', historical);
router.route('/native', native);
router.route('/', tvm);

export default router;
