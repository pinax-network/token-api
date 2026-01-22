import { Hono } from 'hono';
import tvm from './tvm.js';

const router = new Hono();

router.route('/', tvm);

export default router;
