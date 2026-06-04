const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { getBalance, generarHeaders, generarNonce, BITSO_STAGE_URL, BITSO_BASE_URL } = require('./bitso')
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

// Ejecutar pago SPEI
app.post('/ejecutar-spei', async (req, res) => {
  const { apiKey, apiSecret, clabe, monto, beneficiario, referencia } = req.body

  if (!apiKey || !apiSecret || !clabe || !monto) {
    return res.status(400).json({ ok: false, error: 'Faltan parámetros' })
  }

  try {
    const body = JSON.stringify({
      currency: 'mxn',
      protocol: 'clabe',
      amount: monto.toString(),
      clabe: clabe,
      beneficiary: beneficiario || 'Mercado Libre',
      numeric_ref: referencia ? referencia.substring(0, 7) : '1234567',
      notes_ref: 'Pago Bitso Adapter',
      origin_id: `bitso_adapter_${Date.now()}`
    })

    const ruta = '/v3/withdrawals'
    const headers = generarHeaders(apiKey, apiSecret, 'POST', ruta, body)

    const response = await fetch(`${BITSO_BASE_URL}/v3/withdrawals`, {
      method: 'POST',
      headers,
      body
    })

    const data = await response.json()
    console.log('Respuesta SPEI:', JSON.stringify(data))

    if (data.success) {
      res.json({
        ok: true,
        wid: data.payload.wid,
        status: data.payload.status
      })
    } else {
      res.json({ ok: false, error: data.error?.message || 'Error al ejecutar el pago' })
    }
  } catch (err) {
    console.error('Error SPEI:', err.message)
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Webhook de Bitso — recibe eventos de retiro y depósito
app.post('/webhook/bitso', (req, res) => {
  const evento = req.body

  console.log('Webhook recibido:', JSON.stringify(evento))

  if (!evento || !evento.event || !evento.payload) {
    return res.status(400).json({ ok: false, error: 'Payload inválido' })
  }

  // Procesar retiro
  if (evento.event === 'withdrawal') {
    const { wid, status, amount, currency } = evento.payload
    console.log(`Retiro ${wid}: ${status} — ${amount} ${currency}`)

    // Aquí guardarías el estado en DB o notificarías a la extensión
    // Por ahora solo lo loggeamos
  }

  // Procesar depósito
  if (evento.event === 'funding') {
    const { fid, status, amount, currency } = evento.payload
    console.log(`Depósito ${fid}: ${status} — ${amount} ${currency}`)
  }

  // Bitso espera un 200 para confirmar recepción
  res.status(200).json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`Backend corriendo en puerto ${PORT}`)
})