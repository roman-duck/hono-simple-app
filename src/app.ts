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

export default app