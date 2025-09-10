import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { appendTrailingSlash } from 'hono/trailing-slash';
import posts from './routes/posts.js'
import authors from './routes/authors.js'

const app = new Hono()

app.use(appendTrailingSlash());

app.route('/posts/', posts)
app.route('/authors/', authors)

app.get('/', (c) => {
  return c.text('Hello Server!')
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
