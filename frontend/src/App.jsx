import { useState } from 'react'

function App() {
  const [hasKeys, setHasKeys] = useState(false)

  return (
    <div style={{ width: '360px', minHeight: '500px', padding: '24px', fontFamily: 'Arial, sans-serif', background: '#0a0a0a', color: '#ffffff' }}>
      {hasKeys ? <Dashboard /> : <Login onLogin={() => setHasKeys(true)} />}
    </div>
  )
}

function Login({ onLogin }) {
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [pin, setPin] = useState('')

  const handleSubmit = () => {
    if (!apiKey || !apiSecret || !pin) return
    onLogin()
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

      <button style={buttonStyle} onClick={handleSubmit}>
        Conectar cuenta
      </button>
    </div>
  )
}

function Dashboard() {
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

      <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '16px' }}>
        <p style={{ color: '#aaaaaa', fontSize: '12px', margin: '0 0 8px 0' }}>Esperando pago en Mercado Libre...</p>
        <div style={{ width: '100%', height: '2px', background: '#333', borderRadius: '1px' }}>
          <div style={{ width: '30%', height: '100%', background: '#5463FF', borderRadius: '1px' }}></div>
        </div>
      </div>
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