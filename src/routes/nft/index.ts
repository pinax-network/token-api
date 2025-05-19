import { Hono } from 'hono';
import metadata from "./metadata/index.js";
import token from "./token/index.js";

const router = new Hono();

router.route('/metadata', metadata);
router.route('/token', token);

export default router;
