export default function Header({ subtitle }) {
  return (
    <div className="header">
      <img
        src="https://i0.wp.com/mninoticias.com/wp-content/uploads/2023/10/communityIcon_421lpuu04sa61.png?fit=256%2C256&ssl=1"
        alt=""
        className="header-logo-watermark"
      />
      <div className="header-row">
        <span className="header-brand">Bitso Adapter</span>
      </div>
      {subtitle && <p className="header-subtitle">{subtitle}</p>}
    </div>
  )
}