export default function Card({ children, className = '', hover = false, accent = false, white = false }) {
  const extra = [
    hover ? 'card-hover' : '',
    accent ? 'card-accent' : '',
    white ? 'card-white' : '',
    className,
  ].filter(Boolean).join(' ')

  return <div className={`card ${extra}`}>{children}</div>
}
