import { Hono } from 'hono'
import type { Context, Next } from 'hono'
import { jwt, sign } from 'hono/jwt'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
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
const SECRET = 'my-secret-key' // TODO: Use an environment variable 

const cacheStore = new Map();

const createUserSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  age: z.number().int().positive(),
  tags: z.array(z.string()).optional(),
})

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

// Custom caching middleware for Node.js
app.use('/api/public-data', async (c, next) => {
  const cacheKey = c.req.url;

  // Check if the response is in our cache
  if (cacheStore.has(cacheKey)) {
    const cachedItem = cacheStore.get(cacheKey);
    console.log('Serving from custom in-memory cache.');
    return new Response(cachedItem.body, { headers: cachedItem.headers });
  }

  // If not in cache, proceed to the route handler
  await next();

  // After the handler returns, clone and store the response
  if (c.res) {
    const newResponse = c.res.clone();
    const body = await newResponse.text();
    const headers = Object.fromEntries(newResponse.headers.entries());
    cacheStore.set(cacheKey, { body, headers });
    console.log('Storing response in custom in-memory cache.');
  }
});

// Login to get a JWT
app.post('/login', async (c) => {
  const { username } = await c.req.json()
  if (username === 'admin') {
    const payload = {
      sub: username,
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + 60 * 5, // 5 minutes expiration
    }
    const token = await sign(payload, SECRET)
    return c.json({ token })
  }
  return c.json({ error: 'Invalid credentials' }, 401)
})

// Protected route
app.get(
  '/api/protected',
  jwt({ secret: SECRET }),
  (c) => {
    const payload = c.get('jwtPayload')
    return c.json({ message: 'You have access!', payload })
  }
)

// Cached route
app.get(
  '/api/public-data',
  async (c) => {
    console.log('Executing handler with delay...');
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate a delay
    return c.json({ data: 'This is some public data that rarely changes.' })
  }
)

app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  if (isNaN(Number(id))) {
    throw new Error('User ID must be a number.')
  }
  return c.text(`User ID is ${id}`)
})

app.onError((err, c) => {
  console.error(`${err}`)
  return c.json({
    success: false,
    message: err.message,
  }, 500)
})

app.post(
  '/users',
  zValidator('json', createUserSchema), // Use zValidator middleware
  (c) => {
    // The validated data is available on c.req.valid()
    const user = c.req.valid('json')
    console.log(`Creating user: ${user.username} with email ${user.email}`)
    return c.json({
      success: true,
      message: 'User created successfully!',
      user: user,
    }, 201)
  }
)

export default app