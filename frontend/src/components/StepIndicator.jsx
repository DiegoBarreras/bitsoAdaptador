export default function StepIndicator({ steps, current }) {
  return (
    <div className="step-indicator">
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'pending'
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <div className={`step-circle ${state}`} title={label}>
              {i < current ? '✓' : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`step-line ${i < current ? 'done' : 'pending'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
