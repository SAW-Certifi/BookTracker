const router = require('express').Router()
const { isValidObjectId } = require('mongoose')
const Book = require('../models/Book')

// prevent regex injection
const escapeRegex = (value = '') => value.replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&')

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
    const filters = { userId: req.user.uid }

    if (search.trim()) {
      const expression = new RegExp(escapeRegex(search.trim()), 'i')
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
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' })
    const book = await Book.findOne({ _id: req.params.id, userId: req.user.uid })
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
    const created = await Book.create({ userId: req.user.uid, title, author, year, rating })
    res.status(201).json(created)
  } catch (err) { next(err) }
})

// update
router.put('/:id', async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' })
    const { title, author, year, rating } = req.body
    const payload = {}
    if (title !== undefined) payload.title = title
    if (author !== undefined) payload.author = author
    if (year !== undefined) payload.year = year
    if (rating !== undefined) payload.rating = rating

    const updated = await Book.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.uid },
      payload,
      { new: true, runValidators: true }
    )
    if (!updated) return res.status(404).json({ error: 'Not found' })
    res.json(updated)
  } catch (err) { next(err) }
})

// delete
router.delete('/:id', async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' })
    const deleted = await Book.findOneAndDelete({ _id: req.params.id, userId: req.user.uid })
    if (!deleted) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

module.exports = router
