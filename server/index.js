require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err))

app.get('/health', (_req, res) => res.json({ ok: true }))

const authenticate = require('./middleware/authenticate')
const booksRouter = require('./routes/books')
const recommendationsRouter = require('./routes/recommendations')
const accountRouter = require('./routes/account')
app.use('/api/books', authenticate, booksRouter)
app.use('/api/recommendations', authenticate, recommendationsRouter)
app.use('/api/account', authenticate, accountRouter)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Server error' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
