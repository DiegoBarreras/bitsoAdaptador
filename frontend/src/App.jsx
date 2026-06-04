/* global chrome */
import { useState, useEffect } from 'react'
import { validarDatosSPEI } from './utils/validaciones.js'
import { API_URL } from './config.js'

function App() {
  const [hasKeys, setHasKeys] = useState(null)

  useEffect(() => {
    chrome.storage.local.get(['apiKey'], (result) => {
      setHasKeys(!!result.apiKey)
    })
  }, [])

  if (hasKeys === null) return (
    <div style={{ width: '360px', minHeight: '500px', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#aaaaaa' }}>Cargando...</p>
    </div>
  )

  return (
    <div style={{ width: '360px', minHeight: '500px', padding: '24px', fontFamily: 'Arial, sans-serif', background: '#0a0a0a', color: '#ffffff' }}>
      {hasKeys ? <Dashboard onLogout={() => setHasKeys(false)} /> : <Login onLogin={() => setHasKeys(true)} />}
    </div>
  )
}

function Login({ onLogin }) {
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!apiKey || !apiSecret) {
      setError('Todos los campos son requeridos')
      return
    }

    setCargando(true)
    try {
      const res = await fetch(`${API_URL}/verificar-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, apiSecret })
      })
      const data = await res.json()

      if (!data.valido) {
        setError('API Key o Secret inválidos — verifica tus credenciales')
        setCargando(false)
        return
      }

      chrome.storage.local.set({
        apiKey,
        apiSecret,
        balances: data.balances
      }, () => {
        chrome.runtime.sendMessage({ type: 'GUARDAR_KEYS', apiKey, apiSecret })
        setCargando(false)
        onLogin()
      })

    } catch (err) {
      setError('No se pudo conectar con el servidor')
      setCargando(false)
    }
  }

  return (
    <div>
      <h2 style={{ color: '#5463FF', marginBottom: '8px', fontSize: '22px' }}>Bitso Adapter</h2>
      <p style={{ color: '#aaaaaa', fontSize: '13px', marginBottom: '24px' }}>
        Conecta tu cuenta de Bitso para pagar en tiendas
      </p>

      <label style={labelStyle}>API Key</label>
      <input
        style={inputStyle}
        type="text"
        placeholder="Tu API Key de Bitso"
        value={apiKey}
        onChange={e => setApiKey(e.target.value)}
      />

      <label style={labelStyle}>API Secret</label>
      <input
        style={inputStyle}
        type="password"
        placeholder="Tu API Secret de Bitso"
        value={apiSecret}
        onChange={e => setApiSecret(e.target.value)}
      />

      {error && (
        <p style={{ fontSize: '12px', color: '#ff4444', marginTop: '8px' }}>{error}</p>
      )}

      <button style={{ ...buttonStyle, opacity: cargando ? 0.7 : 1 }} onClick={handleSubmit} disabled={cargando}>
        {cargando ? 'Conectando...' : 'Conectar cuenta'}
      </button>
    </div>
  )
}

function Dashboard({ onLogout }) {
  const [balances, setBalances] = useState([])
  const [precios, setPrecios] = useState({})
  const [speiData, setSpeiData] = useState(null)
  const [mostrarVenta, setMostrarVenta] = useState(null)

  const refrescarBalances = () => {
    chrome.runtime.sendMessage({ type: 'REFRESCAR_BALANCE' }, (response) => {
      if (response?.ok && response.balances) {
        const conSaldo = response.balances.filter(b => parseFloat(b.available) > 0)
        setBalances(conSaldo)
      }
    })
  }

  const obtenerPrecios = () => {
    fetch(`${API_URL}/precios`)
      .then(res => res.json())
      .then(data => { if (data.ok) setPrecios(data.precios) })
      .catch(() => {})
  }

  useEffect(() => {
    chrome.storage.local.get(['apiKey', 'apiSecret', 'balances', 'speiData', 'speiPending'], (result) => {
      if (result.apiKey && result.apiSecret) {
        chrome.runtime.sendMessage({ type: 'GUARDAR_KEYS', apiKey: result.apiKey, apiSecret: result.apiSecret })
      }
      if (result.balances) {
        const conSaldo = result.balances.filter(b => parseFloat(b.available) > 0)
        setBalances(conSaldo)
      }
      if (result.speiPending && result.speiData) {
        setSpeiData(result.speiData)
      }
    })

    obtenerPrecios()
    refrescarBalances()

    const intervalo = setInterval(() => {
      refrescarBalances()
      obtenerPrecios()
    }, 30000)

    return () => clearInterval(intervalo)
  }, [])

  if (speiData) {
    return <ResumenPago
      datos={speiData}
      balances={balances}
      precios={precios}
      onCancelar={() => {
        chrome.storage.local.remove(['speiData', 'speiPending'])
        chrome.action.setBadgeText({ text: '' })
        setSpeiData(null)
      }}
      onPagoExitoso={() => {
        chrome.storage.local.remove(['speiData', 'speiPending'])
        chrome.action.setBadgeText({ text: '' })
        setSpeiData(null)
        refrescarBalances()
      }}
    />
  }

  if (mostrarVenta) {
    return <VenderCripto
      balances={balances}
      precios={precios}
      montoObjetivo={null}
      criptoPreseleccionada={mostrarVenta}
      onExito={() => {
        setMostrarVenta(null)
        refrescarBalances()
      }}
      onCancelar={() => setMostrarVenta(null)}
    />
  }

  const saldoMXN = balances.find(b => b.currency === 'mxn')
  const otrasMonedas = balances.filter(b => b.currency !== 'mxn')

  const valorCriptos = otrasMonedas.reduce((total, b) => {
    const precio = precios[b.currency] || 0
    return total + parseFloat(b.available) * precio
  }, 0)

  const totalMXN = (saldoMXN ? parseFloat(saldoMXN.available) : 0) + valorCriptos

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: '#5463FF', margin: 0 }}>Bitso Adapter</h2>
        <span style={{ fontSize: '11px', color: '#e1ee2a' }}>● Conectado</span>
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
        <p style={{ color: '#aaaaaa', fontSize: '12px', margin: '0 0 4px 0' }}>Patrimonio total</p>
        <p style={{ fontSize: '26px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
          ${totalMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#aaaaaa', fontSize: '12px' }}>Saldo MXN</span>
          <span style={{ color: '#ffffff', fontSize: '12px' }}>
            ${saldoMXN ? parseFloat(saldoMXN.available).toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'}
          </span>
        </div>
        {valorCriptos > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ color: '#aaaaaa', fontSize: '12px' }}>Valor en criptos</span>
            <span style={{ color: '#ffffff', fontSize: '12px' }}>
              ${valorCriptos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {otrasMonedas.length > 0 && (
        <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ color: '#aaaaaa', fontSize: '12px', margin: '0 0 12px 0' }}>Criptomonedas</p>
          {otrasMonedas
            .map(b => ({ ...b, valorMXN: parseFloat(b.available) * (precios[b.currency] || 0) }))
            .sort((a, b) => b.valorMXN - a.valorMXN)
            .map(b => (
              <div key={b.currency} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ color: '#ffffff', fontSize: '13px', textTransform: 'uppercase', width: '50px' }}>{b.currency}</span>
                <span style={{ color: '#aaaaaa', fontSize: '12px', flex: 1, textAlign: 'center' }}>
                  {parseFloat(b.available).toFixed(6)}
                </span>
                <span style={{ color: '#e1ee2a', fontSize: '12px', width: '80px', textAlign: 'right' }}>
                  {b.valorMXN > 0 ? `$${b.valorMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'}
                </span>
                <button
                  onClick={() => setMostrarVenta(b.currency)}
                  style={{
                    marginLeft: '8px',
                    padding: '4px 8px',
                    background: '#1a1a2e',
                    border: '1px solid #5463FF',
                    borderRadius: '4px',
                    color: '#5463FF',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Vender
                </button>
              </div>
            ))
          }
        </div>
      )}

      {balances.length === 0 && (
        <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ color: '#aaaaaa', fontSize: '12px', margin: 0 }}>Sin saldo disponible</p>
        </div>
      )}

      <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
        <p style={{ color: '#aaaaaa', fontSize: '12px', margin: '0 0 8px 0' }}>Esperando pago en Mercado Libre...</p>
        <div style={{ width: '100%', height: '2px', background: '#333', borderRadius: '1px' }}>
          <div style={{ width: '30%', height: '100%', background: '#5463FF', borderRadius: '1px' }}></div>
        </div>
      </div>

      <button style={{ ...buttonStyle, background: '#1a1a1a', border: '1px solid #333', marginTop: '8px' }} onClick={() => {
        chrome.storage.local.clear(() => onLogout())
      }}>
        Cerrar sesión
      </button>
    </div>
  )
}

function ResumenPago({ datos, balances, precios, onCancelar, onPagoExitoso }) {
  const [mostrarVenta, setMostrarVenta] = useState(false)
  const validacion = validarDatosSPEI(datos)
  const montoRequerido = parseFloat(datos.monto)

  const saldoMXN = balances.find(b => b.currency === 'mxn')
  const otrasCriptos = balances.filter(b => b.currency !== 'mxn')

  const totalMXN = (saldoMXN ? parseFloat(saldoMXN.available) : 0) +
    otrasCriptos.reduce((total, b) => {
      const precio = precios[b.currency] || 0
      return total + parseFloat(b.available) * precio
    }, 0)

  const alcanzaElSaldo = totalMXN >= montoRequerido
  const puedeConfirmar = validacion.valido && alcanzaElSaldo

  if (mostrarVenta) {
    return <VenderCripto
      balances={balances}
      precios={precios}
      montoObjetivo={datos.monto}
      criptoPreseleccionada={null}
      onExito={() => setMostrarVenta(false)}
      onCancelar={() => setMostrarVenta(false)}
    />
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#5463FF', margin: 0, fontSize: '18px' }}>Pago detectado</h2>
        <span style={{ fontSize: '11px', color: '#e1ee2a' }}>● ML</span>
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
        <p style={{ color: '#aaaaaa', fontSize: '11px', margin: '0 0 4px 0' }}>Monto a pagar</p>
        <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '0', color: '#ffffff' }}>
          ${montoRequerido.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
        </p>
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#aaaaaa', fontSize: '12px' }}>Beneficiario</span>
          <span style={{ color: '#ffffff', fontSize: '12px' }}>{datos.beneficiario}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#aaaaaa', fontSize: '12px' }}>Banco</span>
          <span style={{ color: '#ffffff', fontSize: '12px' }}>{datos.banco}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#aaaaaa', fontSize: '12px' }}>CLABE</span>
          <span style={{ color: '#ffffff', fontSize: '11px' }}>{datos.clabe}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#aaaaaa', fontSize: '12px' }}>Referencia</span>
          <span style={{ color: '#ffffff', fontSize: '12px' }}>{datos.referencia}</span>
        </div>
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#aaaaaa', fontSize: '12px' }}>Saldo total disponible</span>
          <span style={{ color: alcanzaElSaldo ? '#e1ee2a' : '#ff4444', fontSize: '12px', fontWeight: 'bold' }}>
            ${totalMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
          </span>
        </div>
        {!alcanzaElSaldo && (
          <p style={{ color: '#ff4444', fontSize: '11px', margin: '8px 0 0 0' }}>
            Saldo insuficiente. Faltan ${(montoRequerido - totalMXN).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
          </p>
        )}
      </div>

      {!validacion.valido && (
        <div style={{ background: '#2a1a1a', borderRadius: '10px', padding: '12px', marginBottom: '12px', border: '1px solid #ff4444' }}>
          {validacion.errores.map((err, i) => (
            <p key={i} style={{ color: '#ff4444', fontSize: '12px', margin: '0 0 4px 0' }}>⚠️ {err}</p>
          ))}
        </div>
      )}

      {!alcanzaElSaldo && otrasCriptos.length > 0 && (
        <button
          style={{ ...buttonStyle, marginBottom: '8px', background: '#1a1a2e', border: '1px solid #5463FF' }}
          onClick={() => setMostrarVenta(true)}
        >
          Vender cripto para completar el pago
        </button>
      )}

      <button
        style={{ ...buttonStyle, marginBottom: '8px', opacity: !puedeConfirmar ? 0.5 : 1 }}
        onClick={() => {}}
        disabled={!puedeConfirmar}
      >
        Confirmar pago
      </button>

      <button style={{ ...buttonStyle, background: '#1a1a1a', border: '1px solid #333' }} onClick={onCancelar}>
        Cancelar
      </button>
    </div>
  )
}

function VenderCripto({ balances, precios, montoObjetivo, criptoPreseleccionada, onExito, onCancelar }) {
  const criptosOrdenadas = balances
    .filter(b => b.currency !== 'mxn' && parseFloat(b.available) > 0)
    .map(b => ({ ...b, valorMXN: parseFloat(b.available) * (precios[b.currency] || 0) }))
    .sort((a, b) => b.valorMXN - a.valorMXN)

  const [criptoSeleccionada, setCriptoSeleccionada] = useState(
    criptoPreseleccionada
      ? criptosOrdenadas.find(b => b.currency === criptoPreseleccionada) || null
      : null
  )
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [montoPersonalizado, setMontoPersonalizado] = useState('')
  const [usarMontoPersonalizado, setUsarMontoPersonalizado] = useState(false)

  const handleVender = async () => {
    if (!criptoSeleccionada) return
    setCargando(true)
    setError('')

    chrome.storage.local.get(['apiKey', 'apiSecret'], async (result) => {
      try {
        const res = await fetch(`${API_URL}/vender-cripto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: result.apiKey,
            apiSecret: result.apiSecret,
            cripto: criptoSeleccionada.currency,
            montoMXN: montoAVender
          })
        })
        const data = await res.json()

        if (data.ok) {
          setCargando(false)
          onExito()
        } else {
          setError(data.error || 'Error al vender')
          setCargando(false)
        }
      } catch (err) {
        setError('No se pudo conectar con el servidor')
        setCargando(false)
      }
    })
  }

  const montoFinal = usarMontoPersonalizado && montoPersonalizado
    ? parseFloat(montoPersonalizado)
    : null

  const montoAVender = criptoSeleccionada
    ? montoFinal !== null
      ? Math.min(montoFinal, criptoSeleccionada.valorMXN).toFixed(2)
      : montoObjetivo
        ? Math.min(parseFloat(montoObjetivo), criptoSeleccionada.valorMXN).toFixed(2)
        : criptoSeleccionada.valorMXN.toFixed(2)
    : '0.00'
    
  const montoValido = parseFloat(montoAVender) >= 10
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#5463FF', margin: 0, fontSize: '18px' }}>Vender cripto</h2>
        {montoObjetivo && (
          <span style={{ fontSize: '11px', color: '#e1ee2a' }}>
            Necesitas: ${parseFloat(montoObjetivo).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
          </span>
        )}
      </div>

      {criptosOrdenadas.length === 0 ? (
        <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ color: '#aaaaaa', fontSize: '12px', margin: 0 }}>Sin criptomonedas disponibles para vender</p>
        </div>
      ) : (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ color: '#aaaaaa', fontSize: '12px', marginBottom: '8px' }}>Selecciona qué cripto vender:</p>
          {criptosOrdenadas.map(b => (
            <div
              key={b.currency}
              onClick={() => setCriptoSeleccionada(b)}
              style={{
                background: criptoSeleccionada?.currency === b.currency ? '#1a1a2e' : '#1a1a1a',
                border: criptoSeleccionada?.currency === b.currency ? '1px solid #5463FF' : '1px solid transparent',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '8px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {b.currency}
                </span>
                <p style={{ color: '#aaaaaa', fontSize: '11px', margin: '2px 0 0 0' }}>
                  {parseFloat(b.available).toFixed(6)}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#e1ee2a', fontSize: '13px', fontWeight: 'bold' }}>
                  ${b.valorMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
                <p style={{ color: '#aaaaaa', fontSize: '11px', margin: '2px 0 0 0' }}>MXN</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {criptoSeleccionada && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <input
              type="checkbox"
              id="montoPersonalizado"
              checked={usarMontoPersonalizado}
              onChange={e => setUsarMontoPersonalizado(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <label htmlFor="montoPersonalizado" style={{ color: '#aaaaaa', fontSize: '12px', cursor: 'pointer' }}>
              Especificar monto a vender
            </label>
          </div>

          {usarMontoPersonalizado && (
            <div>
              <input
                style={{ ...inputStyle, marginBottom: '4px' }}
                type="number"
                placeholder="Monto en MXN (mínimo $10.00)"
                value={montoPersonalizado}
                onChange={e => setMontoPersonalizado(e.target.value)}
                min="10"
                max={criptoSeleccionada.valorMXN}
              />
              {montoPersonalizado && parseFloat(montoPersonalizado) < 10 && (
                <p style={{ color: '#ff4444', fontSize: '11px', margin: '4px 0 0 0' }}>
                  El monto mínimo de venta es $10.00 MXN
                </p>
              )}
              {montoPersonalizado && parseFloat(montoPersonalizado) > criptoSeleccionada.valorMXN && (
                <p style={{ color: '#ff4444', fontSize: '11px', margin: '4px 0 0 0' }}>
                  No tienes suficiente {criptoSeleccionada.currency.toUpperCase()} — máximo ${criptoSeleccionada.valorMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                </p>
              )}
            </div>
          )}

          <div style={{ background: '#1a1a2e', borderRadius: '10px', padding: '12px', marginTop: '8px', border: '1px solid #5463FF' }}>
            <p style={{ color: '#aaaaaa', fontSize: '11px', margin: '0 0 4px 0' }}>Resumen de venta</p>
            <p style={{ color: '#ffffff', fontSize: '12px', margin: 0 }}>
              Venderás <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{criptoSeleccionada.currency}</span> por{' '}
              <span style={{ color: montoValido ? '#e1ee2a' : '#ff4444', fontWeight: 'bold' }}>
                ${parseFloat(montoAVender).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
              </span>
            </p>
          </div>
        </div>
      )}

      {error && (
        <p style={{ color: '#ff4444', fontSize: '12px', marginBottom: '12px' }}>{error}</p>
      )}

      <button
        style={{ ...buttonStyle, marginBottom: '8px', opacity: (!criptoSeleccionada || cargando || !montoValido) ? 0.5 : 1 }}
        onClick={handleVender}
        disabled={!criptoSeleccionada || cargando || !montoValido}
      >
        {cargando ? 'Vendiendo...' : 'Confirmar venta'}
      </button>

      <button style={{ ...buttonStyle, background: '#1a1a1a', border: '1px solid #333' }} onClick={onCancelar}>
        Cancelar
      </button>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  color: '#aaaaaa',
  marginBottom: '6px',
  marginTop: '16px'
}

const inputStyle = {
  width: '100%',
  padding: '10px',
  background: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '13px',
  boxSizing: 'border-box'
}

const buttonStyle = {
  width: '100%',
  padding: '12px',
  background: '#5463FF',
  border: 'none',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  cursor: 'pointer',
  marginTop: '24px'
}

export default App