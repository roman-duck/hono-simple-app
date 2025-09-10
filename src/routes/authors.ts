import { Hono } from 'hono'

const authors = new Hono()

authors.get('/', (c) => c.json({ authors: [] }))
authors.get('/:id', (c) => c.json({ author: { id: c.req.param('id') } }))

export default authors
