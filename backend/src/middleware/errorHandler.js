export const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err.message, err.stack)
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message)
    return res.status(400).json({ success: false, message: 'Validation failed.', errors })
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    return res.status(400).json({ success: false, message: `${field} already exists.` })
  }
  if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid ID.' })
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error.' })
}
