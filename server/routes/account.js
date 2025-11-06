const router = require('express').Router()
const Book = require('../models/Book')

router.delete('/', async (req, res, next) => {
  try {
    await Book.deleteMany({ userId: req.user.uid })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

module.exports = router
