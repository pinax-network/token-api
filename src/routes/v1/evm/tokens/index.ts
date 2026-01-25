import { Hono } from 'hono';
import evm from './evm.js';
import native from './native/index.js';

const router = new Hono();

router.route('/', evm);
router.route('/native', native);

export default router;
