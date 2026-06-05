export default function Header({ subtitle, showStatus = false, onBack }) {
  return (
    <div className="header">
      <div className="header-row">
        {onBack && (
          <button onClick={onBack} className="header-back">←</button>
        )}
        <span className="header-brand">Bitso Adapter</span>
        {showStatus && (
          <div className="status-indicator">
            <div className="status-dot" />
            <span>Conectado</span>
          </div>
        )}
      </div>
      {subtitle && <p className="header-subtitle">{subtitle}</p>}
    </div>
  )
}
