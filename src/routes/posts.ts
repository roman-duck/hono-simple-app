import { Hono } from 'hono'

const posts = new Hono()

posts.get('/', (c) => c.json({ posts: [] }))
posts.post('/', (c) => c.json({ message: 'Post created' }, 201))
posts.get('/:id', (c) => c.json({ post: { id: c.req.param('id') } }))

export default posts