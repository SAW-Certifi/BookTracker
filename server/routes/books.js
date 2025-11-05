const router = require('express').Router()
const Book = require('../models/Book')

// get all
router.get('/', async (_req, res, next) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 })
    res.json(books)
  } catch (err) { next(err) }
})

// get from book id
router.get('/:id', async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id)
    if (!book) return res.status(404).json({ error: 'Not found' })
    res.json(book)
  } catch (err) { next(err) }
})

// create
router.post('/', async (req, res, next) => {
  try {
    const { title, author, year, rating } = req.body
    if (!title || !author)
      return res.status(400).json({ error: 'title and author required' })
    const created = await Book.create({ title, author, year, rating })
    res.status(201).json(created)
  } catch (err) { next(err) }
})

// update
router.put('/:id', async (req, res, next) => {
  try {
    const updated = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!updated) return res.status(404).json({ error: 'Not found' })
    res.json(updated)
  } catch (err) { next(err) }
})

// delete
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await Book.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

module.exports = router
