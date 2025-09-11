import { Hono } from 'hono'
import type { Context, Next } from 'hono'
import { appendTrailingSlash } from 'hono/trailing-slash';
import posts from './routes/posts.js'
import authors from './routes/authors.js'

type AppVariables = {
  user: {
    id: string
    name: string
    roles: string[]
  }
}

const app = new Hono<{ Variables: AppVariables }>()

// Middleware to "authenticate" a user from a header
const authMiddleware = async (c: Context, next: Next) => {
  const userId = c.req.header('X-User-ID')
  if (!userId) {
    return c.json({ error: 'Missing X-User-ID header' }, 401)
  }

  // TODO: fetch user from database
  const user = {
    id: userId,
    name: 'Test User',
    roles: ['admin', 'editor'],
  }

  // Use c.set() to attach the user data to the context
  c.set('user', user)

  await next()
}

app.use(appendTrailingSlash());

app.route('/posts/', posts)
app.route('/authors/', authors)

app.get('/', (c) => {
  return c.text('Hello Server!')
})

app.get('/admin/dashboard', authMiddleware, (c) => {
  // Use c.get() to retrieve the typed user data
  const user = c.get('user')

  if (!user.roles.includes('admin')) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  return c.json({
    message: `Welcome to the admin dashboard, ${user.name}!`,
    userId: user.id,
  })
})

export default app