const express = require('express')
const router = express.Router()

// Stubs — se implementan en los siguientes pasos (HMAC + mocks)
router.get('/balance', (req, res) => {
  res.status(501).json({ error: 'No implementado aún' })
})

router.post('/orders', (req, res) => {
  res.status(501).json({ error: 'No implementado aún' })
})

router.post('/withdrawals', (req, res) => {
  res.status(501).json({ error: 'No implementado aún' })
})

router.post('/webhooks', (req, res) => {
  res.status(501).json({ error: 'No implementado aún' })
})

module.exports = router
