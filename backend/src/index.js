const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { getBalance } = require('./bitso')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
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

app.listen(PORT, () => {
  console.log(`Backend corriendo en puerto ${PORT}`)
})