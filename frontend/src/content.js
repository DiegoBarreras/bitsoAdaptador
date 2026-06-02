/* global chrome */

let enviado = false

function extractSPEIData() {
  const data = {
    clabe: null,
    monto: null,
    referencia: null,
    beneficiario: null,
    banco: null
  }

  const clabeContainer = document.querySelector('[data-testid="copy_code_container"]')
  if (clabeContainer) {
    const clabeText = clabeContainer.querySelector('[data-testid="copy_code_label"]')?.innerText?.trim()
    const clabeMatch = clabeText?.match(/\b\d{18}\b/)
    if (clabeMatch) data.clabe = clabeMatch[0]
  }
  if (!data.clabe) {
    const match = document.body.innerText.match(/\b\d{18}\b/)
    if (match) data.clabe = match[0]
  }

  const montoContainer = document.querySelector('[data-testid="copy_amount_container"]')
  if (montoContainer) {
    const montoText = montoContainer.querySelector('[data-testid="copy_amount_label"]')?.innerText?.trim()
    const montoMatch = montoText?.match(/[\d,]+(\.\d{2})?/)
    if (montoMatch) data.monto = montoMatch[0].replace(',', '')
  }
  if (!data.monto) {
    const match = document.body.innerText.match(/\$\s*[\d,]+(\.\d{2})?/)
    if (match) data.monto = match[0].replace(/[$,\s]/g, '')
  }

  const containers = document.querySelectorAll('[data-testid="title_subtitle_container"]')
  containers.forEach(container => {
    const etiqueta = container.querySelector('[data-testid="label_title-0"]')?.innerText?.trim()
    const valor = container.querySelector('[data-testid="label_subtitle-0"]')?.innerText?.trim()
    if (!etiqueta || !valor) return
    if (etiqueta.toLowerCase().includes('beneficiario')) data.beneficiario = valor
    else if (etiqueta.toLowerCase().includes('banco')) data.banco = valor
    else if (etiqueta.toLowerCase().includes('referencia')) data.referencia = valor.replace(/\s/g, '')
  })

  return data
}

function isSPEIPage() {
  return !!(
    document.querySelector('[data-testid="copy_code_container"]') ||
    document.querySelector('[data-testid="copy_amount_container"]')
  )
}

function init() {
  if (enviado) return
  if (!isSPEIPage()) return

  const data = extractSPEIData()
  if (!data.clabe || !data.monto) return

  enviado = true
  console.log('Bitso Adapter: datos SPEI extraídos', data)

  chrome.runtime.sendMessage({
    type: 'SPEI_DETECTED',
    data
  })
}

const observer = new MutationObserver(() => {
  if (isSPEIPage()) {
    observer.disconnect()
    init()
  }
})

observer.observe(document.body, { childList: true, subtree: true })
init()