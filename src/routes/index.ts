// routes/index.ts
import { Hono } from 'hono'
// import token from './token/index.js'
import health from './health.js'
import version from './version.js'

const router = new Hono()

// router.route('/token', token)
router.route('/', health)
router.route('/', version)

export default router
