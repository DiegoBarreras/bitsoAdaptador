export default function Button({ children, onClick, variant = 'primary', disabled = false, loading = false }) {
  const cls = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    success: 'btn-success',
    outline: 'btn-outline',
  }[variant] || 'btn-primary'

  return (
    <button
      className={`btn ${cls}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? 'Procesando...' : children}
    </button>
  )
}
