import { Hono } from 'hono';
import balances from './balances/index.js';

const router = new Hono();

router.route('/balances', balances);

export default router;
