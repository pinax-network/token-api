import { Hono } from 'hono';
import evm from './evm.js';
import historical from './historical/index.js';
import native from './native/index.js';

const router = new Hono();

router.route('/historical', historical);
router.route('/native', native);
router.route('/', evm);

export default router;
