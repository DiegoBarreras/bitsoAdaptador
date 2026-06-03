// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(`[Error] ${err.message}`)

  const status = err.status || 500
  const message =
    process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message

  res.status(status).json({ error: message })
}

module.exports = errorHandler
