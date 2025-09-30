import { Hono } from 'hono';
import native from './native/index.js';
import svm from './svm.js';

const router = new Hono();

router.route('/native', native);
router.route('/', svm);

export default router;
