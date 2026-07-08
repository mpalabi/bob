import { useEffect, useRef, useState, useCallback } from 'react'

interface BobMascotProps {
  open: boolean
  onClick: () => void
  size?: number
  trackingRadius?: number
}

interface Offset { x: number; y: number }

const PUPIL_TRAVEL = 3.5

export function BobMascot({ open, onClick, size = 64, trackingRadius = 320 }: BobMascotProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [left, setLeft] = useState<Offset>({ x: 0, y: 0 })
  const [right, setRight] = useState<Offset>({ x: 0, y: 0 })
  const [blink, setBlink] = useState(false)
  const [hovered, setHovered] = useState(false)

  // Mouse tracking
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > trackingRadius) {
      setLeft({ x: 0, y: 0 })
      setRight({ x: 0, y: 0 })
      return
    }

    const angle = Math.atan2(dy, dx)
    const t = Math.min(dist / trackingRadius, 1)
    const px = Math.cos(angle) * PUPIL_TRAVEL * t
    const py = Math.sin(angle) * PUPIL_TRAVEL * t
    setLeft({ x: px, y: py })
    setRight({ x: px, y: py })
  }, [trackingRadius])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [onMouseMove])

  // Random blink loop
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const schedule = () => {
      timeout = setTimeout(() => {
        setBlink(true)
        setTimeout(() => { setBlink(false); schedule() }, 140)
      }, 2200 + Math.random() * 3800)
    }
    schedule()
    return () => clearTimeout(timeout)
  }, [])

  // Notion-style minimal eyes: simple round dots, lots of negative space
  const EYE_R = 2.8
  const eyeRy = blink ? 0.5 : EYE_R
  const EYE_COLOR = '#f4efe6' // warm cream — Notion paper tone

  return (
    <div
      ref={ref}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: size, height: size, cursor: 'pointer' }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transition: 'transform 0.2s ease, filter 0.2s ease',
          transform: hovered ? 'scale(1.1)' : open ? 'scale(0.95)' : 'scale(1)',
          filter: hovered
            ? 'drop-shadow(0 6px 20px rgba(0,0,0,0.7))'
            : 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))'
        }}
      >
        <defs>
          {/* Dark gradient body */}
          <radialGradient id="bodyGrad" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#2a2a2a" />
            <stop offset="100%" stopColor="#111111" />
          </radialGradient>

          {/* Subtle glow on border */}
          <filter id="glow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Outer ring — subtle border */}
        <circle cx="32" cy="32" r="30" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

        {/* Body */}
        <circle cx="32" cy="32" r="29" fill="url(#bodyGrad)" />

        {/* Cheek blush — subtle warm glow */}
        {!open && (
          <>
            <ellipse cx="16" cy="40" rx="6" ry="3.5" fill="rgba(255,120,120,0.08)" />
            <ellipse cx="48" cy="40" rx="6" ry="3.5" fill="rgba(255,120,120,0.08)" />
          </>
        )}

        {/* ── Left eye ── simple round dot, drifts slightly to track */}
        <ellipse
          cx={26 + left.x} cy={30 + left.y} rx={EYE_R} ry={eyeRy}
          fill={EYE_COLOR}
          style={{ transition: 'cx 0.06s ease, cy 0.06s ease' }}
        />

        {/* ── Right eye ── */}
        <ellipse
          cx={38 + right.x} cy={30 + right.y} rx={EYE_R} ry={eyeRy}
          fill={EYE_COLOR}
          style={{ transition: 'cx 0.06s ease, cy 0.06s ease' }}
        />

        {/* ── Mouth ── small soft smile; a touch wider when open */}
        <path
          d={open ? 'M28 41 Q32 44.5 36 41' : 'M29 41 Q32 43.5 35 41'}
          stroke={EYE_COLOR}
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
          style={{ transition: 'd 0.15s ease' }}
        />
      </svg>
    </div>
  )
}
