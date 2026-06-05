export default function InputField({ label, type = 'text', placeholder, value, onChange, error, min, max }) {
  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      <input
        className={`input-field${error ? ' input-has-error' : ''}`}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
      />
      {error && <span className="input-error-msg">{error}</span>}
    </div>
  )
}
