/* global chrome */
// Service Worker — recibe mensajes del content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SPEI_DETECTED') {
    console.log('Bitso Adapter: datos recibidos en background', message.data)
  }
})