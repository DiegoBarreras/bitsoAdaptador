/* global chrome */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SPEI_DETECTED') {
    console.log('Bitso Adapter: datos recibidos', message.data)

    chrome.storage.local.set({ speiData: message.data, speiPending: true })

    chrome.notifications.create(`spei_${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '¡Pago detectado en Mercado Libre!',
      message: `$${message.data.monto} MXN a ${message.data.beneficiario} — Abre la extensión de Bitso Adapter para pagar con cripto.`,
    }, (notificationId) => {
      if (chrome.runtime.lastError) {
        console.error('Error en notificación:', chrome.runtime.lastError.message)
      } else {
        console.log('Notificación creada:', notificationId)
      }
    })

    chrome.action.setBadgeText({ text: '!' })
    chrome.action.setBadgeBackgroundColor({ color: '#5463FF' })
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