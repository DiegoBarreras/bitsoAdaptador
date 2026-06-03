const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
require('dotenv').config()

const { getBalance } = require('./bitso')
const bitsoRoutes = require('./routes/bitso')
const authRoutes = require('./routes/auth')
const errorHandler = require('./middleware/errorHandler')

const app = express()
const PORT = process.env.PORT || 3000

// ── Seguridad ──────────────────────────────────────────────
app.use(helmet())

// ── CORS ───────────────────────────────────────────────────
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true)
    if (origin.startsWith('chrome-extension://')) return callback(null, true)
    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) {
      return callback(null, true)
    }
    callback(new Error(`CORS bloqueado para origin: ${origin}`))
  }
}))

// ── Parsing ────────────────────────────────────────────────
app.use(express.json())

// ── Logging ────────────────────────────────────────────────
app.use(morgan('dev'))

// ── Rutas ──────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.post('/verificar-keys', async (req, res) => {
  const { apiKey, apiSecret } = req.body

  if (!apiKey || !apiSecret) {
    return res.status(400).json({ valido: false, error: 'Faltan credenciales' })
  }

  try {
    const data = await getBalance(apiKey, apiSecret)
    console.log('Respuesta de Bitso:', JSON.stringify(data).substring(0, 200))

    if (data.success) {
      res.json({ valido: true, balances: data.payload.balances })
    } else {
      res.json({ valido: false, error: 'Credenciales inválidas' })
    }
  } catch (err) {
    console.error('Error:', err.message)
    res.status(500).json({ valido: false, error: 'Error al conectar con Bitso' })
  }
})

app.use('/api/bitso', bitsoRoutes)
app.use('/api/auth', authRoutes)

// ── 404 ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` })
})

// ── Error handler (siempre al final) ───────────────────────
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`)
})
