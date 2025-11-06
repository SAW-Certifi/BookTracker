const router = require('express').Router()
const Book = require('../models/Book')

// get all with basic search, filter, and pagination
router.get('/', async (req, res, next) => {
  try {
    const {
      search = '',
      minRating,
      maxRating,
      page = 1,
      limit = 10,
      sortField,
      sortOrder
    } = req.query

    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10))
    const parsedPage = Math.max(1, parseInt(page, 10) || 1)
    const filters = {}

    if (search.trim()) {
      const expression = new RegExp(search.trim(), 'i')
      filters.$or = [{ title: expression }, { author: expression }]
    }

    if ((minRating ?? '') !== '' || (maxRating ?? '') !== '') {
      filters.rating = {}
      if ((minRating ?? '') !== '') filters.rating.$gte = Number(minRating)
      if ((maxRating ?? '') !== '') filters.rating.$lte = Number(maxRating)
    }

    const sortableFields = new Set(['year', 'rating', 'createdAt'])
    const resolvedSortField = sortableFields.has(sortField) ? sortField : 'createdAt'
    const resolvedSortOrder = sortOrder === 'asc' ? 1 : -1

    const total = await Book.countDocuments(filters)
    const totalPages = total === 0 ? 1 : Math.ceil(total / parsedLimit)
    const safePage = Math.min(parsedPage, totalPages)
    const skip = (safePage - 1) * parsedLimit

    const books = await Book.find(filters)
      .sort({ [resolvedSortField]: resolvedSortOrder })
      .skip(skip)
      .limit(parsedLimit)

    res.json({
      data: books,
      pagination: {
        page: safePage,
        limit: parsedLimit,
        total,
        totalPages
      }
    })
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
