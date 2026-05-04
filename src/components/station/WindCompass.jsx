import { useId } from 'react'
import { degreesToCompass } from '../../utils/formatters'

/**
 * Wind direction compass dial. Renders a simple SVG needle that rotates
 * to the given degree. The compass direction label is shown below.
 */
export default function WindCompass({ degrees, speed, unit = 'm/s', size = 170 }) {
  const reactId = useId()
  const gradientId = `compassBg-${reactId.replace(/:/g, '')}`
  const hasDirection = Number.isFinite(Number(degrees))
  const deg = hasDirection ? (((Number(degrees) % 360) + 360) % 360) : 0
  const r = size / 2
  const ticks = Array.from({ length: 16 })
  const labels = ['N', 'E', 'S', 'W']

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          <defs>
            <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#161d29" />
              <stop offset="100%" stopColor="#0d1117" />
            </radialGradient>
          </defs>
          <circle cx={r} cy={r} r={r - 2} fill={`url(#${gradientId})`} stroke="#222b3a" strokeWidth="2" />
          <circle cx={r} cy={r} r={r - 16} fill="none" stroke="rgba(255,255,255,0.04)" />

          {ticks.map((_, index) => {
            const angle = (index / 16) * 2 * Math.PI
            const x1 = r + Math.cos(angle) * (r - 6)
            const y1 = r + Math.sin(angle) * (r - 6)
            const x2 = r + Math.cos(angle) * (r - (index % 4 === 0 ? 14 : 10))
            const y2 = r + Math.sin(angle) * (r - (index % 4 === 0 ? 14 : 10))
            return (
              <line
                key={index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={index % 4 === 0 ? '#9ba8bd' : '#4b5668'}
                strokeWidth={index % 4 === 0 ? 1.5 : 1}
              />
            )
          })}

          {labels.map((label, index) => {
            const angle = (index * Math.PI) / 2 - Math.PI / 2
            const x = r + Math.cos(angle) * (r - 28)
            const y = r + Math.sin(angle) * (r - 28)
            return (
              <text
                key={label}
                x={x}
                y={y + 4}
                textAnchor="middle"
                fill={label === 'N' ? '#3fb950' : '#9ba8bd'}
                fontSize="11"
                fontFamily='"Space Grotesk", sans-serif'
                fontWeight={label === 'N' ? 700 : 500}
              >
                {label}
              </text>
            )
          })}

          {hasDirection && (
            <g transform={`rotate(${deg} ${r} ${r})`}>
              <polygon points={`${r},${16} ${r - 6},${r} ${r + 6},${r}`} fill="#f85149" opacity="0.95" />
              <polygon
                points={`${r},${size - 16} ${r - 6},${r} ${r + 6},${r}`}
                fill="#e6edf3"
                opacity="0.75"
              />
              <circle cx={r} cy={r} r="5" fill="#0d1117" stroke="#e6edf3" strokeWidth="1.5" />
            </g>
          )}
        </svg>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-muted">Direction</div>
          <div className="metric-value text-base font-semibold text-text-primary">
            {hasDirection ? (
              <>
                {deg.toFixed(0)} deg <span className="text-text-muted">{degreesToCompass(deg)}</span>
              </>
            ) : (
              <span className="text-text-muted">--</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-muted">Speed</div>
          <div className="metric-value text-base font-semibold text-text-primary">
            {speed?.toFixed ? speed.toFixed(1) : speed ?? '--'}{' '}
            <span className="text-text-muted">{unit}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
