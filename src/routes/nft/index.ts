import { Hono } from 'hono';
import metadata from "./metadata/index.js";
import token from "./token/index.js";
import wallet from "./wallet/index.js";

const router = new Hono();

router.route('/metadata', metadata);
router.route('/token', token);
router.route('/wallet', wallet);

export default router;
