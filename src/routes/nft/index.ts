import { Hono } from 'hono';
import metadata from "./metadata/index.js";

const router = new Hono();

router.route('/metadata', metadata);

export default router;
