import { Hono } from 'hono';
import v1 from './v1/index.js';

const router = new Hono();

router.route('/v1', v1);

export default router;
