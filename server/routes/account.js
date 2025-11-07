const router = require('express').Router()
const Book = require('../models/Book')
const admin = require('../services/firebaseAdmin')

const MIN_DISPLAY_NAME_LENGTH = 2
const MAX_DISPLAY_NAME_LENGTH = 40
router.patch('/profile', async (req, res, next) => {
  const { displayName } = req.body || {}
  const trimmed = typeof displayName === 'string' ? displayName.trim() : ''

  if (!trimmed) {
    return res.status(400).json({ error: 'Display name is required.' }) // client side check too
  }
  if (trimmed.length < MIN_DISPLAY_NAME_LENGTH) { // client side check too
    return res.status(400).json({ error: `Display name must be at least ${MIN_DISPLAY_NAME_LENGTH} characters.` })
  }
  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) { // client side check too
    return res.status(400).json({ error: `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.` })
  }

  try {
    await admin.auth().updateUser(req.user.uid, { displayName: trimmed })
    res.json({ displayName: trimmed })
  } catch (err) {
    next(err)
  }
})

router.delete('/', async (req, res, next) => {
  try {
    await Book.deleteMany({ userId: req.user.uid })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

module.exports = router
