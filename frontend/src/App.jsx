/* global chrome */
import { useState, useEffect } from 'react'
import { validarDatosSPEI } from './utils/validaciones.js'
import { API_URL } from './config.js'
import './App.css'
import Header from './components/Header.jsx'
import InputField from './components/InputField.jsx'
import Button from './components/Button.jsx'
import Card from './components/Card.jsx'
import StepIndicator from './components/StepIndicator.jsx'

const STEPS = ['Acceso', 'Pago SPEI', 'Confirmar']

function App() {
  const [hasKeys, setHasKeys] = useState(null)

  useEffect(() => {
    chrome.storage.local.get(['apiKey'], (result) => {
      setHasKeys(!!result.apiKey)
    })
  }, [])

  if (hasKeys === null) return (
    <div className="loading-screen">
      <p className="loading-text">Cargando...</p>
    </div>
  )

  return hasKeys
    ? <Dashboard onLogout={() => setHasKeys(false)} />
    : <Login onLogin={() => setHasKeys(true)} />
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
        setError('API Key o Secret invalidos — verifica tus credenciales')
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
    <div className="app-root">
      <Header subtitle="Conecta tu cuenta para pagar en tiendas" />
      <div className="screen">
        <InputField
          label="API Key"
          type="text"
          placeholder="Tu API Key de Bitso"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
        />
        <InputField
          label="API Secret"
          type="password"
          placeholder="Tu API Secret de Bitso"
          value={apiSecret}
          onChange={e => setApiSecret(e.target.value)}
        />
        {error && <p className="error-text">{error}</p>}
        <Button onClick={handleSubmit} loading={cargando} disabled={cargando}>
          Conectar cuenta
        </Button>
      </div>
    </div>
  )
}

function Dashboard({ onLogout }) {
  const [balances, setBalances] = useState([])
  const [precios, setPrecios] = useState({})
  const [speiData, setSpeiData] = useState(null)
  const [mostrarVenta, setMostrarVenta] = useState(null)
  const [vista, setVista] = useState('dashboard')

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
    }, 5000)

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
    <div className="app-root">
      <Header showStatus />
      <NavBar vista={vista} onCambiar={setVista} />
      {vista === 'historial' ? <Historial /> : (
      <div className="screen">

        <Card>
          <p className="balance-label">Patrimonio total</p>
          <p className="balance-big">
            ${totalMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            <span className="balance-unit">MXN</span>
          </p>
          <div className="row mt-8">
            <span className="label-sm">Saldo MXN</span>
            <span className="value-sm">
              ${saldoMXN ? parseFloat(saldoMXN.available).toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'}
            </span>
          </div>
          {valorCriptos > 0 && (
            <div className="row mt-4">
              <span className="label-sm">Valor en criptos</span>
              <span className="value-sm">
                ${valorCriptos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </Card>

        {otrasMonedas.length > 0 && (
          <Card>
            <p className="section-title mb-12">Criptomonedas</p>
            {otrasMonedas
              .map(b => ({ ...b, valorMXN: parseFloat(b.available) * (precios[b.currency] || 0) }))
              .sort((a, b) => b.valorMXN - a.valorMXN)
              .map(b => (
                <div key={b.currency} className="row mb-8" style={{ alignItems: 'center' }}>
                  <span className="crypto-ticker" style={{ width: '44px' }}>{b.currency}</span>
                  <span className="label-sm" style={{ flex: 1, textAlign: 'center' }}>
                    {parseFloat(b.available).toFixed(6)}
                  </span>
                  <div style={{ textAlign: 'right', marginRight: '8px' }}>
                    <span className={b.valorMXN >= 10 ? 'crypto-val-ok' : 'crypto-val-low'}>
                      {b.valorMXN > 0 ? `$${b.valorMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'}
                    </span>
                    {b.valorMXN > 0 && b.valorMXN < 10 && (
                      <p className="crypto-val-label-low">min. $10</p>
                    )}
                  </div>
                  <button
                    className="btn-sell-inline"
                    onClick={() => setMostrarVenta(b.currency)}
                  >
                    Vender
                  </button>
                </div>
              ))
            }
          </Card>
        )}

        {balances.length === 0 && (
          <Card>
            <p className="label-sm">Sin saldo disponible</p>
          </Card>
        )}

        <Button
          variant="secondary"
          onClick={() => chrome.storage.local.clear(() => onLogout())}
        >
          Cerrar sesion
        </Button>

      </div>
      )}
    </div>
  )
}

function NavBar({ vista, onCambiar }) {
  return (
    <div className="nav-bar">
      <button
        className={`nav-btn${vista === 'dashboard' ? ' active' : ''}`}
        onClick={() => onCambiar('dashboard')}
      >
        Inicio
      </button>
      <button
        className={`nav-btn${vista === 'historial' ? ' active' : ''}`}
        onClick={() => onCambiar('historial')}
      >
        Historial
      </button>
    </div>
  )
}

function Historial() {
  const [transacciones, setTransacciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('todos')

  useEffect(() => {
    chrome.storage.local.get(['apiKey', 'apiSecret'], (result) => {
      fetch(`${API_URL}/historial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: result.apiKey, apiSecret: result.apiSecret })
      })
        .then(res => res.json())
        .then(data => {
          if (data.ok) setTransacciones(data.transacciones)
          else setError(data.error || 'Error al cargar el historial')
          setCargando(false)
        })
        .catch(() => {
          setError('No se pudo conectar con el servidor')
          setCargando(false)
        })
    })
  }, [])

  const formatFecha = (isoStr) => {
    const d = new Date(isoStr)
    return d.toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  if (cargando) return (
    <div className="screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <p className="loading-text">Cargando historial...</p>
    </div>
  )

  if (error) return (
    <div className="screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <p className="error-text">{error}</p>
    </div>
  )

  if (transacciones.length === 0) return (
    <div className="screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <p className="label-sm">Sin transacciones registradas</p>
    </div>
  )

  const txFiltradas = transacciones.filter(tx => {
    if (filtro === 'transacciones') return tx.tipo === 'compra' || tx.tipo === 'venta'
    if (filtro === 'retiros') return tx.tipo === 'spei'
    return true
  })

  return (
    <div className="screen">
      <div className="filter-bar">
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'transacciones', label: 'Transacciones' },
          { key: 'retiros', label: 'Retiros SPEI' }
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`filter-chip${filtro === key ? ' active' : ''}`}
            onClick={() => setFiltro(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="tx-list">
        {txFiltradas.length === 0 && (
          <p className="label-sm" style={{ textAlign: 'center', padding: '24px 0' }}>
            Sin resultados para este filtro
          </p>
        )}
        {txFiltradas.map(tx => (
          <div key={tx.id} className="tx-item">
            <div className="row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`tx-badge tx-badge-${tx.tipo}`}>
                  {tx.tipo === 'spei' ? 'SPEI' : tx.tipo}
                </span>
                <span className="crypto-ticker">{tx.cripto}</span>
              </div>
              <span className={`tx-amount tx-amount-${tx.tipo}`}>
                {tx.tipo === 'compra' ? '+' : '-'}${parseFloat(tx.montoMXN).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
              </span>
            </div>
            {tx.tipo !== 'spei' && tx.cantidad !== null && (
              <p className="tx-detail">
                {parseFloat(tx.cantidad).toFixed(6)} {tx.cripto} @ ${parseFloat(tx.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })} c/u
              </p>
            )}
            {tx.tipo === 'spei' && tx.beneficiario && (
              <p className="tx-detail">
                {tx.beneficiario} · {tx.status === 'complete' ? 'Completado' : tx.status}
              </p>
            )}
            <p className="tx-date">{formatFecha(tx.fecha)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ResumenPago({ datos, balances, precios, onCancelar, onPagoExitoso }) {
  const [mostrarVenta, setMostrarVenta] = useState(false)
  const [pinMode, setPinMode] = useState(false)
  const [pinValue, setPinValue] = useState('')
  const [pagoExitoso, setPagoExitoso] = useState(false)

  const validacion = validarDatosSPEI(datos)
  const montoRequerido = parseFloat(datos.monto)

  const saldoMXN = balances.find(b => b.currency === 'mxn')
  const otrasCriptos = balances.filter(b => b.currency !== 'mxn')

  const totalMXN = (saldoMXN ? parseFloat(saldoMXN.available) : 0) +
    otrasCriptos.reduce((total, b) => {
      const precio = precios[b.currency] || 0
      return total + parseFloat(b.available) * precio
    }, 0)

  const saldoDisponibleMXN = saldoMXN ? parseFloat(saldoMXN.available) : 0
  const alcanzaElSaldo = saldoDisponibleMXN >= montoRequerido
  const puedeConfirmar = validacion.valido && alcanzaElSaldo

  if (pagoExitoso) {
    return (
      <div className="app-root">
        <Header />
        <div className="success-wrapper">
          <div className="success-icon">✓</div>
          <p className="success-title">Pago enviado</p>
          <p className="success-subtitle">
            Tu transferencia SPEI de ${montoRequerido.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN fue procesada.
          </p>
          <Button onClick={onPagoExitoso}>Volver al inicio</Button>
        </div>
      </div>
    )
  }

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

  if (pinMode) {
    return (
      <div className="app-root">
        <Header subtitle="Confirma el pago SPEI" />
        <StepIndicator steps={STEPS} current={2} />
        <div className="screen">
          <Card>
            <div className="row">
              <span className="label-sm">Monto a transferir</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-dark)' }}>
                ${montoRequerido.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
              </span>
            </div>
            <div className="row mt-8">
              <span className="label-sm">Beneficiario</span>
              <span className="value-sm">{datos.beneficiario}</span>
            </div>
          </Card>
          <InputField
            label="PIN de confirmacion"
            type="password"
            placeholder="Ingresa tu PIN de 6 dígitos"
            value={pinValue}
            onChange={e => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6)
              setPinValue(val)
            }}
          />
          <Button
            variant="success"
            onClick={() => {
              chrome.storage.local.remove(['speiData', 'speiPending'])
              chrome.action.setBadgeText({ text: '' })
              setPagoExitoso(true)
            }}
            disabled={pinValue.length !== 6}
          >
            Confirmar pago
          </Button>
          <Button variant="secondary" onClick={() => setPinMode(false)}>
            Regresar
          </Button>
        </div>
      </div>
    )
  }

  const clabeOculta = datos.clabe
    ? `${'*'.repeat(Math.max(0, datos.clabe.length - 4))}${datos.clabe.slice(-4)}`
    : '—'

  return (
    <div className="app-root">
      <Header subtitle="Transferencia detectada en Mercado Libre" />
      <StepIndicator steps={STEPS} current={1} />
      <div className="screen">

        <Card>
          <p className="balance-label">Monto a pagar</p>
          <p className="amount-big">
            ${montoRequerido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            <span className="balance-unit">MXN</span>
          </p>
        </Card>

        <Card>
          <p className="section-title mb-12">Datos de transferencia</p>
          <div className="row">
            <span className="label-sm">Beneficiario</span>
            <span className="value-sm">{datos.beneficiario}</span>
          </div>
          <div className="row mt-8">
            <span className="label-sm">Banco</span>
            <span className="value-sm">{datos.banco}</span>
          </div>
          <div className="row mt-8">
            <span className="label-sm">CLABE</span>
            <span className="value-sm-mono">{clabeOculta}</span>
          </div>
          <div className="row mt-8">
            <span className="label-sm">Referencia</span>
            <span className="value-sm">{datos.referencia}</span>
          </div>
        </Card>

        <Card>
          <div className="row">
            <span className="label-sm">Saldo total disponible</span>
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: alcanzaElSaldo ? 'var(--text-dark)' : 'var(--error)'
            }}>
              ${totalMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
            </span>
          </div>
          {!alcanzaElSaldo && (
            <p className="error-text mt-8">
              Saldo insuficiente. Faltan ${(montoRequerido - totalMXN).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
            </p>
          )}
        </Card>

        {!validacion.valido && (
          <div className="error-block">
            {validacion.errores.map((err, i) => (
              <p key={i}>{err}</p>
            ))}
          </div>
        )}

        {!alcanzaElSaldo && otrasCriptos.length > 0 && (
          <Button variant="outline" onClick={() => setMostrarVenta(true)}>
            Vender cripto para completar el pago
          </Button>
        )}

        <Button
          variant="success"
          disabled={!puedeConfirmar}
          onClick={() => setPinMode(true)}
        >
          Confirmar pago
        </Button>

        <Button variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>

      </div>
    </div>
  )
}

function VenderCripto({ balances, precios, montoObjetivo, criptoPreseleccionada, onExito, onCancelar }) {
  const criptosOrdenadas = balances
    .filter(b => b.currency !== 'mxn' && parseFloat(b.available) > 0)
    .map(b => ({ ...b, valorMXN: parseFloat(b.available) * (precios[b.currency] || 0) }))
    .sort((a, b) => b.valorMXN - a.valorMXN)

  const [criptoSeleccionada, setCriptoSeleccionada] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [montoPersonalizado, setMontoPersonalizado] = useState('')
  const [usarMontoPersonalizado, setUsarMontoPersonalizado] = useState(false)
  const [feeInfo, setFeeInfo] = useState(null)
  const [confirmar, setConfirmar] = useState(false)

  useEffect(() => {
    if (criptoPreseleccionada && criptosOrdenadas.length > 0 && !criptoSeleccionada) {
      const encontrada = criptosOrdenadas.find(b => b.currency === criptoPreseleccionada)
      if (encontrada) setCriptoSeleccionada(encontrada)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criptoPreseleccionada, precios])

  const handleVender = async () => {
    if (!criptoSeleccionada) return
    setCargando(true)
    setError('')

    chrome.storage.local.get(['apiKey', 'apiSecret'], async (result) => {
      try {
        console.log('Vendiendo:', {
          usarMontoPersonalizado,
          montoObjetivo,
          cantidadCripto: (!usarMontoPersonalizado && !montoObjetivo) 
            ? (parseFloat(criptoSeleccionada.available) * 0.985).toString() 
            : undefined
        })
        const debeUsarCantidad = !usarMontoPersonalizado && 
          (!montoObjetivo || parseFloat(criptoSeleccionada?.valorMXN) < parseFloat(montoObjetivo))

        const res = await fetch(`${API_URL}/vender-cripto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: result.apiKey,
            apiSecret: result.apiSecret,
            cripto: criptoSeleccionada.currency,
            montoMXN: montoAVender,
            ...(debeUsarCantidad
              ? { cantidadCripto: (parseFloat(criptoSeleccionada.available) * 0.985).toString() }
              : {})
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
        : (criptoSeleccionada.valorMXN * 0.95).toFixed(2)
    : '0.00'

  const montoValido = parseFloat(montoAVender) >= 10

  useEffect(() => {
    console.log('useEffect fees ejecutado, cripto:', criptoSeleccionada?.currency)
    if (!criptoSeleccionada) return

    setFeeInfo(null)

    chrome.storage.local.get(['apiKey', 'apiSecret'], (result) => {
      fetch(`${API_URL}/fees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: result.apiKey,
          apiSecret: result.apiSecret,
          cripto: criptoSeleccionada.currency
        })
      })
        .then(res => res.json())
        .then(data => { if (data.ok) setFeeInfo(data) })
        .catch(() => {})
    })
  }, [criptoSeleccionada?.currency])

  if (confirmar) {
    return (
      <div className="app-root">
        <Header subtitle="Confirmar venta" />
        <div className="screen">
          <Card>
            <p className="balance-label mb-8" style={{ textAlign: 'center' }}>Vas a vender</p>
            <p className="amount-big" style={{ textAlign: 'center' }}>
              ${parseFloat(montoAVender).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              <span className="balance-unit">MXN</span>
            </p>
            <p className="label-sm mt-8" style={{ textAlign: 'center' }}>
              de{' '}
              <strong style={{ textTransform: 'uppercase', color: 'var(--text-dark)' }}>
                {criptoSeleccionada.currency}
              </strong>
            </p>
            {feeInfo && (
              <p className="label-sm mt-8" style={{ textAlign: 'center' }}>
                Recibiras aprox.{' '}
                <strong style={{ color: 'var(--text-dark)' }}>
                  ${(parseFloat(montoAVender) * (1 - parseFloat(feeInfo.taker_fee_decimal))).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                </strong>{' '}
                despues del fee
              </p>
            )}
          </Card>

          <Button loading={cargando} disabled={cargando} onClick={handleVender}>
            {cargando ? 'Vendiendo...' : 'Aceptar'}
          </Button>
          <Button variant="secondary" onClick={() => setConfirmar(false)} disabled={cargando}>
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  const montoErrorPersonalizado = montoPersonalizado && parseFloat(montoPersonalizado) < 10
    ? 'El monto minimo de venta es $10.00 MXN'
    : montoPersonalizado && parseFloat(montoPersonalizado) > criptoSeleccionada?.valorMXN
      ? `Maximo $${criptoSeleccionada?.valorMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`
      : undefined

  return (
    <div className="app-root">
      <Header
        subtitle={montoObjetivo
          ? `Necesitas $${parseFloat(montoObjetivo).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`
          : 'Selecciona la cripto a vender'
        }
      />
      <div className="screen">

        {criptosOrdenadas.length === 0 ? (
          <Card>
            <p className="label-sm">Sin criptomonedas disponibles para vender</p>
          </Card>
        ) : (
          <Card>
            <p className="section-title mb-12">Selecciona cripto</p>
            {criptosOrdenadas.map(b => (
              <div
                key={b.currency}
                className={`crypto-list-item${criptoSeleccionada?.currency === b.currency ? ' selected' : ''}`}
                onClick={() => setCriptoSeleccionada(b)}
              >
                <div>
                  <p className="crypto-ticker">{b.currency}</p>
                  <p className="crypto-qty">{parseFloat(b.available).toFixed(6)}</p>
                </div>
                <div>
                  <p className={b.valorMXN >= 10 ? 'crypto-val-ok' : 'crypto-val-low'}>
                    ${b.valorMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                  <p className={b.valorMXN >= 10 ? 'crypto-val-label' : 'crypto-val-label-low'}>
                    {b.valorMXN >= 10 ? 'MXN' : 'min. $10 MXN'}
                  </p>
                </div>
              </div>
            ))}
          </Card>
        )}

        {criptoSeleccionada && (
          <>
            <div className="checkbox-row">
              <input
                type="checkbox"
                id="montoPersonalizado"
                checked={usarMontoPersonalizado}
                onChange={e => setUsarMontoPersonalizado(e.target.checked)}
              />
              <label className="checkbox-label" htmlFor="montoPersonalizado">
                Especificar monto a vender
              </label>
            </div>

            {usarMontoPersonalizado && (
              <InputField
                type="number"
                placeholder="Monto en MXN (minimo $10.00)"
                value={montoPersonalizado}
                onChange={e => setMontoPersonalizado(e.target.value)}
                min="10"
                max={criptoSeleccionada.valorMXN}
                error={montoErrorPersonalizado}
              />
            )}

            <Card accent>
              <p className="section-title mb-12">Resumen de venta</p>
              <div className="row">
                <span className="label-sm">Venderás</span>
                <span className="crypto-ticker">{criptoSeleccionada.currency}</span>
              </div>
              <div className="row mt-8">
                <span className="label-sm">Monto bruto</span>
                <span className="value-sm">
                  ${parseFloat(montoAVender).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                </span>
              </div>
              {feeInfo && (
                <div className="row mt-4">
                  <span className="label-sm">Fee ({feeInfo.taker_fee_percent}%)</span>
                  <span className="fee-debit">
                    -${(parseFloat(montoAVender) * parseFloat(feeInfo.taker_fee_decimal)).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                  </span>
                </div>
              )}
              <hr className="divider" />
              <div className="row">
                <span className="label-sm" style={{ fontWeight: 600 }}>Recibiras</span>
                <span className="receive-amount">
                  ${feeInfo
                    ? (parseFloat(montoAVender) * (1 - parseFloat(feeInfo.taker_fee_decimal))).toLocaleString('es-MX', { minimumFractionDigits: 2 })
                    : parseFloat(montoAVender).toLocaleString('es-MX', { minimumFractionDigits: 2 })
                  } MXN
                </span>
              </div>
            </Card>
          </>
        )}

        {error && <p className="error-text">{error}</p>}

        <Button
          disabled={!criptoSeleccionada || cargando || !montoValido}
          onClick={() => setConfirmar(true)}
        >
          Revisar venta
        </Button>

        <Button variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>

      </div>
    </div>
  )
}

export default App
