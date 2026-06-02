/* global chrome */
// Content Script — detecta checkout SPEI de Mercado Libre

function extractSPEIData() {
  const data = {
    clabe: null,
    monto: null,
    referencia: null,
    beneficiario: null,
    banco: null
  }

  // ── CLABE ──────────────────────────────────────────────────
  const clabeContainer = document.querySelector('[data-testid="copy_code_container"]')
  if (clabeContainer) {
    const clabeText = clabeContainer.querySelector('[data-testid="copy_code_label"]')?.innerText?.trim()
    // Validar con regex: CLABE siempre tiene 18 dígitos
    const clabeMatch = clabeText?.match(/\b\d{18}\b/)
    if (clabeMatch) data.clabe = clabeMatch[0]
  }
  // Fallback con regex directo sobre el texto de la página
  if (!data.clabe) {
    const match = document.body.innerText.match(/\b\d{18}\b/)
    if (match) data.clabe = match[0]
  }

  // ── MONTO ──────────────────────────────────────────────────
  const montoContainer = document.querySelector('[data-testid="copy_amount_container"]')
  if (montoContainer) {
    const montoText = montoContainer.querySelector('[data-testid="copy_amount_label"]')?.innerText?.trim()
    // Limpiar el formato: "$ 144" → "144.00"
    const montoMatch = montoText?.match(/[\d,]+(\.\d{2})?/)
    if (montoMatch) data.monto = montoMatch[0].replace(',', '')
  }
  // Fallback con regex
  if (!data.monto) {
    const match = document.body.innerText.match(/\$\s*[\d,]+(\.\d{2})?/)
    if (match) data.monto = match[0].replace(/[$,\s]/g, '')
  }

  // ── BENEFICIARIO, BANCO Y REFERENCIA ───────────────────────
  // Los tres usan data-testid="title_subtitle_container"
  // Los distinguimos por el texto de la etiqueta interna
  const containers = document.querySelectorAll('[data-testid="title_subtitle_container"]')

  containers.forEach(container => {
    const etiqueta = container.querySelector('[data-testid="label_title-0"]')?.innerText?.trim()
    const valor = container.querySelector('[data-testid="label_subtitle-0"]')?.innerText?.trim()

    if (!etiqueta || !valor) return

    if (etiqueta.toLowerCase().includes('beneficiario')) {
      data.beneficiario = valor
    } else if (etiqueta.toLowerCase().includes('banco')) {
      data.banco = valor
    } else if (etiqueta.toLowerCase().includes('referencia')) {
      // Limpiar espacios de la referencia: "560 8904" → "5608904"
      data.referencia = valor.replace(/\s/g, '')
    }
  })

  return data
}

function isSPEIPage() {
  // Verificar que estamos en una página de pago SPEI de ML
  return !!(
    document.querySelector('[data-testid="copy_code_container"]') ||
    document.querySelector('[data-testid="copy_amount_container"]')
  )
}

function init() {
  if (!isSPEIPage()) return

  const data = extractSPEIData()

  // Verificar que tenemos los datos mínimos necesarios
  if (!data.clabe || !data.monto) {
    console.warn('Bitso Adapter: página SPEI detectada pero faltan datos')
    return
  }

  console.log('Bitso Adapter: datos SPEI extraídos', data)

  // Enviar datos al service worker
  chrome.runtime.sendMessage({
    type: 'SPEI_DETECTED',
    data
  })
}

// ML usa React — el DOM puede cargar después del script
// Usamos MutationObserver para esperar a que los elementos aparezcan
const observer = new MutationObserver(() => {
  if (isSPEIPage()) {
    observer.disconnect()
    init()
  }
})

observer.observe(document.body, {
  childList: true,
  subtree: true
})

// También intentar inmediatamente por si ya cargó
init()