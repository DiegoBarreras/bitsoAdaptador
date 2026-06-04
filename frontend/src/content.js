// Content Script — detecta el checkout SPEI de Mercado Libre
console.log('Bitso Adapter: content script cargado')

// ─── Selectores CSS candidatos para cada dato ───────────────────────────────
const SELECTORS = {
  clabe: [
    '[data-testid="clabe"]',
    '.clabe-number',
    '.andes-typography--body-m',
    '[class*="clabe"]',
    '[class*="bank-account"]',
  ],
  monto: [
    '[data-testid="total-amount"]',
    '[class*="total-amount"]',
    '[class*="payment-amount"]',
    '.price-tag-amount',
    '[class*="price"]',
  ],
  referencia: [
    '[data-testid="reference"]',
    '[class*="reference"]',
    '[class*="payment-reference"]',
  ],
  vigencia: [
    '[data-testid="expiration"]',
    '[class*="expiration"]',
    '[class*="vigencia"]',
    '[class*="time-limit"]',
    '[class*="countdown"]',
  ],
}

// ─── Regex como fallback ────────────────────────────────────────────────────
const REGEX = {
  clabe:     /\b\d{18}\b/,
  monto:     /\$[\d,]+\.\d{2}/,
  referencia:/(?:referencia|referencia de pago|ref\.?)[:\s]*([A-Z0-9\-]{6,20})/i,
  vigencia:  /\d+\s*(?:minutos?|horas?|hrs?|min)/i,
}

// ─── Detectar si es página de pago SPEI ────────────────────────────────────
function isSPEIPage() {
  const url = window.location.href
  const text = document.body?.innerText || ''

  const urlMatch =
    url.includes('/checkout') ||
    url.includes('/pagos') ||
    url.includes('/payment')

  const textMatch =
    text.includes('CLABE') ||
    text.includes('transferencia') ||
    text.includes('SPEI') ||
    text.includes('depósito bancario')

  return urlMatch && textMatch
}

// ─── Obtener texto con selectores candidatos ────────────────────────────────
function queryText(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el?.innerText?.trim()) return el.innerText.trim()
  }
  return null
}

// ─── Extraer los 4 datos SPEI ───────────────────────────────────────────────
function extractSPEIData() {
  const fullText = document.body?.innerText || ''

  let clabe = queryText(SELECTORS.clabe)
  if (!clabe || !/^\d{18}$/.test(clabe.replace(/\s/g, ''))) {
    clabe = fullText.match(REGEX.clabe)?.[0] ?? null
  } else {
    clabe = clabe.replace(/\s/g, '')
  }

  let monto = queryText(SELECTORS.monto)
  if (!monto || !/\$/.test(monto)) {
    monto = fullText.match(REGEX.monto)?.[0] ?? null
  }
  if (monto) monto = monto.replace(/[$,]/g, '').trim()

  let referencia = queryText(SELECTORS.referencia)
  if (!referencia) {
    referencia = fullText.match(REGEX.referencia)?.[1] ?? null
  }

  let vigencia = queryText(SELECTORS.vigencia)
  if (!vigencia) {
    vigencia = fullText.match(REGEX.vigencia)?.[0] ?? null
  }

  return { clabe, monto, referencia, vigencia }
}

// ─── Enviar datos al service worker ────────────────────────────────────────
function sendToServiceWorker(data) {
  chrome.runtime.sendMessage(
    { type: 'SPEI_DETECTED', data },
    (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Bitso Adapter: error al enviar mensaje —', chrome.runtime.lastError.message)
      } else {
        console.log('Bitso Adapter: respuesta del service worker —', response)
      }
    }
  )
}

// ─── Lógica principal con MutationObserver ──────────────────────────────────
function init() {
  if (!isSPEIPage()) {
    console.log('Bitso Adapter: página no es checkout SPEI, en espera...')
  }

  let intentos = 0
  const MAX_INTENTOS = 20
  const INTERVALO_MS = 1500

  const observer = new MutationObserver(() => {
    if (!isSPEIPage()) return

    intentos++
    const data = extractSPEIData()
    const todosEncontrados = data.clabe && data.monto && data.referencia

    console.log(`Bitso Adapter [intento ${intentos}]:`, data)

    if (todosEncontrados || intentos >= MAX_INTENTOS) {
      observer.disconnect()
      console.log('Bitso Adapter: enviando al service worker', data)
      sendToServiceWorker(data)
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  })

  if (isSPEIPage()) {
    const data = extractSPEIData()
    if (data.clabe && data.monto) {
      observer.disconnect()
      console.log('Bitso Adapter: datos encontrados en carga inicial', data)
      sendToServiceWorker(data)
    }
  }
}

export { extractSPEIData, isSPEIPage }

init()