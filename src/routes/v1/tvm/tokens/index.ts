import { Hono } from 'hono';
import native from './native/index.js';
import tvm from './tvm.js';

const router = new Hono();

router.route('/', tvm);
router.route('/native', native);

export default router;
