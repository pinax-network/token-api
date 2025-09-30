import { Hono } from 'hono';
import svm from './svm.js';

const router = new Hono();

router.route('/', svm);

export default router;
