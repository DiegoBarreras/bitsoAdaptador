/* global chrome */

const API_URL = 'https://bitsoadaptador-backend.onrender.com'

// Keys en memoria — se limpian cuando el service worker se duerme o se cierra Brave
let keysEnMemoria = null

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // Guardar keys en memoria al hacer login
  if (message.type === 'GUARDAR_KEYS') {
    keysEnMemoria = {
      apiKey: message.apiKey,
      apiSecret: message.apiSecret
    }
    console.log('Bitso Adapter: keys guardadas en memoria')
    sendResponse({ ok: true })
    return true
  }

  // Refrescar balance
  if (message.type === 'REFRESCAR_BALANCE') {
    if (!keysEnMemoria) {
      sendResponse({ ok: false, error: 'Sin sesión activa' })
      return true
    }

    fetch(`${API_URL}/verificar-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keysEnMemoria)
    })
      .then(res => res.json())
      .then(data => {
        if (data.valido) {
          chrome.storage.local.set({ balances: data.balances })
          sendResponse({ ok: true, balances: data.balances })
        } else {
          sendResponse({ ok: false, error: 'Keys inválidas' })
        }
      })
      .catch(err => sendResponse({ ok: false, error: err.message }))

    return true // mantener canal abierto para respuesta async
  }

  // Detectar pago SPEI
  if (message.type === 'SPEI_DETECTED') {
    console.log('Bitso Adapter: datos recibidos', message.data)

    chrome.storage.local.set({ speiData: message.data, speiPending: true })

    chrome.action.setBadgeText({ text: '!' })
    chrome.action.setBadgeBackgroundColor({ color: '#5463FF' })

    chrome.notifications.create(`spei_${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '¡Pago detectado en Mercado Libre!',
      message: `$${message.data.monto} MXN a ${message.data.beneficiario} — Abre la extensión para pagar con cripto.`
    })
  }
})

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('spei_')) {
    chrome.tabs.query({ url: '*://*.mercadolibre.com.mx/checkout/finisher/*' }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { active: true })
        chrome.windows.update(tabs[0].windowId, { focused: true })
      }
    })
  }
})