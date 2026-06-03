/* global chrome */
import { useState, useEffect } from 'react'

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

async function cifrarTexto(texto, pin) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin.padEnd(32, '0')),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    keyMaterial,
    encoder.encode(texto)
  )
  const buffer = new Uint8Array(encrypted)
  return {
    iv: Array.from(iv),
    data: Array.from(buffer)
  }
}

function Login({ onLogin }) {
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!apiKey || !apiSecret || !pin) {
      setError('Todos los campos son requeridos')
      return
    }
    if (pin.length < 6) {
      setError('El PIN debe tener 6 dígitos')
      return
    }
    if (!/^\d+$/.test(pin)) {
      setError('El PIN solo puede contener números')
      return
    }

    setCargando(true)
    try {
      // Verificar keys contra Bitso antes de guardar
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

      // Keys válidas — cifrar y guardar
      const keyCifrada = await cifrarTexto(apiKey, pin)
      const secretCifrado = await cifrarTexto(apiSecret, pin)

      chrome.storage.local.set({
        apiKey: keyCifrada,
        apiSecret: secretCifrado,
        balances: data.balances
      }, () => {
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

      <label style={labelStyle}>PIN de seguridad</label>
      <input
        style={inputStyle}
        type="password"
        placeholder="Crea un PIN de 6 dígitos"
        maxLength={6}
        value={pin}
        onChange={e => setPin(e.target.value)}
      />

      <p style={{ fontSize: '11px', color: '#e1ee2a', marginTop: '8px' }}>
        * Tu PIN cifra las keys localmente. No lo olvides.
      </p>

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
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: '#5463FF', margin: 0 }}>Bitso Adapter</h2>
        <span style={{ fontSize: '11px', color: '#e1ee2a' }}>● Conectado</span>
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
        <p style={{ color: '#aaaaaa', fontSize: '12px', margin: '0 0 4px 0' }}>Balance disponible</p>
        <p style={{ fontSize: '26px', fontWeight: 'bold', margin: '0 0 4px 0' }}>$1,580.00 MXN</p>
        <p style={{ color: '#aaaaaa', fontSize: '13px', margin: 0 }}>0.023 BTC</p>
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
        <p style={{ color: '#aaaaaa', fontSize: '12px', margin: '0 0 8px 0' }}>Esperando pago en Mercado Libre...</p>
        <div style={{ width: '100%', height: '2px', background: '#333', borderRadius: '1px' }}>
          <div style={{ width: '30%', height: '100%', background: '#5463FF', borderRadius: '1px' }}></div>
        </div>
      </div>

      <button style={{ ...buttonStyle, background: '#1a1a1a', border: '1px solid #333', marginTop: '8px' }} onClick={onLogout}>
        Cerrar sesión
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