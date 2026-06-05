export default function Header({ subtitle, showStatus = false }) {
  return (
    <div className="header">
      <div className="header-row">
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
