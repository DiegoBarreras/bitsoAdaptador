const express = require('express')
const router = express.Router()

// Stub — se implementa cuando llegue el turno de Magic Link + JWT
router.post('/magic-link', (req, res) => {
  res.status(501).json({ error: 'No implementado aún' })
})

module.exports = router
