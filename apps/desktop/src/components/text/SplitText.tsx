import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { cn } from '../../lib/utils'

interface SplitTextProps {
  text: string
  className?: string
  /** ms before the animation starts */
  delay?: number
  /** ms between each unit */
  step?: number
  by?: 'chars' | 'words'
}

// React Bits-style reveal: splits text into units and staggers them in (anime.js).
export function SplitText({ text, className, delay = 0, step = 22, by = 'chars' }: SplitTextProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const units = ref.current.querySelectorAll('[data-split]')
    const anim = animate(units, {
      opacity: [0, 1],
      translateY: [14, 0],
      duration: 620,
      delay: stagger(step, { start: delay }),
      ease: 'outExpo'
    })
    return () => { anim.pause() }
  }, [text, delay, step])

  const units = by === 'words' ? text.split(/(\s+)/) : Array.from(text)

  return (
    <span ref={ref} className={cn('inline-block', className)} aria-label={text}>
      {units.map((u, i) => (
        <span
          key={i}
          data-split
          aria-hidden="true"
          style={{ display: 'inline-block', whiteSpace: 'pre', opacity: 0, willChange: 'transform, opacity' }}
        >
          {u}
        </span>
      ))}
    </span>
  )
}
