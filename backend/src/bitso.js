const crypto = require('crypto')

const BITSO_STAGE_URL = 'https://api.bitso.com/api/v3'

// Nonce v2 — obligatorio desde noviembre 2025
function generarNonce() {
  const timestamp = Date.now() // 13 dígitos
  const salt = Math.floor(100000 + Math.random() * 900000) // 6 dígitos
  return `${timestamp}${salt}`
}

function generarHeaders(apiKey, apiSecret, metodo, ruta, body = '') {
  const nonce = generarNonce()
  const mensaje = `${nonce}${metodo.toUpperCase()}${ruta}${body}`
  const firma = crypto
    .createHmac('sha256', apiSecret)
    .update(mensaje)
    .digest('hex')

  return {
    'Authorization': `Bitso ${apiKey}:${nonce}:${firma}`,
    'Content-Type': 'application/json'
  }
}

async function getBalance(apiKey, apiSecret) {
  const ruta = '/api/v3/balance/'
  const headers = generarHeaders(apiKey, apiSecret, 'GET', ruta)
  const response = await fetch(`${BITSO_STAGE_URL}/balance/`, { headers })
  return response.json()
}

module.exports = { getBalance, generarHeaders, generarNonce, BITSO_STAGE_URL }