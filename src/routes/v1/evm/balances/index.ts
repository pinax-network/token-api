import { Hono } from 'hono';
import evm from './evm.js';
import historical from './historical/index.js';
import native from './native/index.js';

const router = new Hono();

router.route('/', evm);
router.route('/native', native);
router.route('/historical', historical);

export default router;
