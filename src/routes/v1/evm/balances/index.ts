import { Hono } from 'hono';
import evm from './evm.js';
import historical from './historical/index.js';

const router = new Hono();

router.route('/historical', historical);
router.route('/', evm);

export default router;
