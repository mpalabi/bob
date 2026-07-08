import { animate, stagger } from 'animejs'

type Targets = Element | Element[] | NodeListOf<Element>

interface StaggerInOpts {
  y?: number
  delayStep?: number
  duration?: number
  start?: number
}

// Fade + rise children in sequence. Elements should start at opacity:0 to avoid flash.
export function staggerIn(targets: Targets, opts: StaggerInOpts = {}) {
  const { y = 10, delayStep = 28, duration = 480, start = 0 } = opts
  return animate(targets as never, {
    opacity: [0, 1],
    translateY: [y, 0],
    delay: stagger(delayStep, { start }),
    duration,
    ease: 'outExpo'
  })
}

// Quick scale pop, for press / send feedback.
export function pop(target: Element, scale = 0.88) {
  return animate(target as never, {
    scale: [scale, 1],
    duration: 320,
    ease: 'outBack'
  })
}
