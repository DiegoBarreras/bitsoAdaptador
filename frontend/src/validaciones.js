// Validaciones previas al pago

// ── CLABE ──────────────────────────────────────────────────────
// Algoritmo oficial de Banxico para validar CLABE
export function validarCLABE(clabe) {
  if (!clabe || clabe.length !== 18) return false
  if (!/^\d{18}$/.test(clabe)) return false

  const pesos = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7]
  let suma = 0

  for (let i = 0; i < 17; i++) {
    suma += (parseInt(clabe[i]) * pesos[i]) % 10
  }

  const digitoControl = (10 - (suma % 10)) % 10
  return digitoControl === parseInt(clabe[17])
}

// ── MONTO ──────────────────────────────────────────────────────
const MONTO_MINIMO = 1.00      // Mínimo SPEI por regulación Banxico
const MONTO_MAXIMO = 260745.38 // Límite de Bitso

export function validarMonto(monto) {
  const cantidad = parseFloat(monto)

  if (isNaN(cantidad)) return { valido: false, error: 'El monto no es un número válido' }
  if (cantidad <= 0) return { valido: false, error: 'El monto debe ser mayor a $0' }
  if (cantidad < MONTO_MINIMO) return { valido: false, error: `El monto mínimo es $${MONTO_MINIMO} MXN` }
  if (cantidad > MONTO_MAXIMO) return { valido: false, error: `El monto excede el límite de $${MONTO_MAXIMO.toLocaleString()} MXN` }

  return { valido: true, error: null }
}

// ── VALIDACIÓN COMPLETA ────────────────────────────────────────
export function validarDatosSPEI(datos) {
  const errores = []

  if (!validarCLABE(datos.clabe)) {
    errores.push('La CLABE del receptor no es válida')
  }

  const resultadoMonto = validarMonto(datos.monto)
  if (!resultadoMonto.valido) {
    errores.push(resultadoMonto.error)
  }

  if (!datos.referencia) {
    errores.push('Falta la referencia de pago')
  }

  return {
    valido: errores.length === 0,
    errores
  }
}