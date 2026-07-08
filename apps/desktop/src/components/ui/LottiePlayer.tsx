import Lottie, { LottieComponentProps } from 'lottie-react'
import { cn } from '../../lib/utils'

export interface LottiePlayerProps extends Omit<LottieComponentProps, 'animationData' | 'size'> {
  animationData: object
  size?: number | string
  className?: string
}

export function LottiePlayer({ animationData, size, className, style, ...props }: LottiePlayerProps) {
  return (
    <Lottie
      animationData={animationData}
      className={cn('flex-shrink-0', className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    />
  )
}
