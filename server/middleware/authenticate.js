const admin = require('../services/firebaseAdmin')

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : ''

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token)
    const requiresVerifiedEmail = !req.originalUrl.startsWith('/api/account')
    if (requiresVerifiedEmail && !decoded.email_verified) {
      return res.status(403).json({ error: 'Email address not verified' })
    }
    req.user = {
      uid: decoded.uid,
      email: decoded.email || null
    }
    next()
  } catch (error) {
    console.error('Firebase auth error:', error.message)
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

module.exports = authenticate
