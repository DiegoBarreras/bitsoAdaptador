/* global chrome */
import { useState, useEffect } from 'react'
import { validarDatosSPEI } from './utils/validaciones.js'

function App() {
  const [hasKeys, setHasKeys] = useState(null)

  useEffect(() => {
    // Verificar si ya hay keys guardadas al abrir la extensión
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
      const res = await fetch('http://localhost:3000/verificar-keys', {
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

      // Guardar keys directamente y mandar al service worker
      chrome.storage.local.set({
        apiKey,
        apiSecret,
        balances: data.balances
      }, () => {
        chrome.runtime.sendMessage({
          type: 'GUARDAR_KEYS',
          apiKey,
          apiSecret
        })
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

  const obtenerPrecios = () => {
    fetch('http://localhost:3000/precios')
      .then(res => res.json())
      .then(data => {
        if (data.ok) setPrecios(data.precios)
      })
      .catch(() => {})
  }

  useEffect(() => {
    chrome.storage.local.get(['apiKey', 'apiSecret', 'balances', 'speiData', 'speiPending'], (result) => {
      if (result.apiKey && result.apiSecret) {
        chrome.runtime.sendMessage({
          type: 'GUARDAR_KEYS',
          apiKey: result.apiKey,
          apiSecret: result.apiSecret
        })
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

    chrome.runtime.sendMessage({ type: 'REFRESCAR_BALANCE' }, (response) => {
      if (response?.ok && response.balances) {
        const conSaldo = response.balances.filter(b => parseFloat(b.available) > 0)
        setBalances(conSaldo)
      }
    })

    const intervalo = setInterval(() => {
      chrome.runtime.sendMessage({ type: 'REFRESCAR_BALANCE' }, (response) => {
        if (response?.ok && response.balances) {
          const conSaldo = response.balances.filter(b => parseFloat(b.available) > 0)
          setBalances(conSaldo)
        }
      })
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
    />
  }

  const saldoMXN = balances.find(b => b.currency === 'mxn')
  const otrasMonedas = balances.filter(b => b.currency !== 'mxn')

  // Calcular valor en MXN de cada cripto
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
          {otrasMonedas.map(b => {
            const precio = precios[b.currency] || 0
            const valorMXN = parseFloat(b.available) * precio
            return (
              <div key={b.currency} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#ffffff', fontSize: '13px', textTransform: 'uppercase', width: '60px' }}>{b.currency}</span>
                <span style={{ color: '#aaaaaa', fontSize: '12px', flex: 1, textAlign: 'center' }}>
                  {parseFloat(b.available).toFixed(6)}
                </span>
                <span style={{ color: '#e1ee2a', fontSize: '12px', textAlign: 'right' }}>
                  {precio > 0 ? `$${valorMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'}
                </span>
              </div>
            )
          })}
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

function ResumenPago({ datos, balances, precios, onCancelar }) {
  const validacion = validarDatosSPEI(datos)
  const montoRequerido = parseFloat(datos.monto)

  // Calcular saldo total disponible
  const saldoMXN = balances.find(b => b.currency === 'mxn')
  const otrasCriptos = balances.filter(b => b.currency !== 'mxn')

  const totalMXN = (saldoMXN ? parseFloat(saldoMXN.available) : 0) +
    otrasCriptos.reduce((total, b) => {
      const precio = precios[b.currency] || 0
      return total + parseFloat(b.available) * precio
    }, 0)

  const alcanzaElSaldo = totalMXN >= montoRequerido
  const puedeConfirmar = validacion.valido && alcanzaElSaldo

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
            Saldo insuficiente. Hacen falta ${(montoRequerido - totalMXN).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
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