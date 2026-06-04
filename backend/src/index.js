const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { getBalance, generarHeaders, generarNonce, BITSO_STAGE_URL } = require('./bitso')
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

// Obtener precios de criptos en MXN
app.get('/precios', async (req, res) => {
  try {
    const response = await fetch('https://api.bitso.com/api/v3/ticker/')
    const data = await response.json()
    
    if (data.success) {
      // Crear un mapa de precio por cripto en MXN
      const precios = {}
      data.payload.forEach(ticker => {
        if (ticker.book.endsWith('_mxn')) {
          const cripto = ticker.book.replace('_mxn', '')
          precios[cripto] = parseFloat(ticker.last)
        }
      })
      res.json({ ok: true, precios })
    } else {
      res.json({ ok: false, precios: {} })
    }
  } catch (err) {
    res.status(500).json({ ok: false, precios: {} })
  }
})

// Vender cripto a MXN
app.post('/vender-cripto', async (req, res) => {
  const { apiKey, apiSecret, cripto, montoMXN } = req.body

  if (!apiKey || !apiSecret || !cripto || !montoMXN) {
    return res.status(400).json({ ok: false, error: 'Faltan parámetros' })
  }

  try {
    const book = `${cripto}_mxn`
    const body = JSON.stringify({
      book,
      side: 'sell',
      type: 'market',
      minor: montoMXN.toString()
    })

    const ruta = '/api/v3/orders/'
    const headers = generarHeaders(apiKey, apiSecret, 'POST', ruta, body)

    const response = await fetch(`${BITSO_STAGE_URL}/orders/`, {
      method: 'POST',
      headers,
      body
    })

    const data = await response.json()
    console.log('Respuesta orden de venta:', JSON.stringify(data))

    if (data.success) {
      res.json({ ok: true, oid: data.payload.oid })
    } else {
      res.json({ ok: false, error: data.error?.message || 'Error al vender' })
    }
  } catch (err) {
    console.error('Error venta cripto:', err.message)
    res.status(500).json({ ok: false, error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Backend corriendo en puerto ${PORT}`)
})