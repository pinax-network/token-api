// routes/index.ts
import { Hono } from 'hono'
import mcp from './mcp/index.js'
import token from './token/index.js'
import health from './health.js'
import version from './version.js'

const router = new Hono()

router.route('/', mcp)
router.route('/', token)
router.route('/', health)
router.route('/', version)

export default router
