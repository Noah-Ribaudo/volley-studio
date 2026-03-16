import type { ComponentType, SVGProps } from 'react'

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

export function HugeiconsIcon({
  icon: Icon,
  className,
}: {
  icon: IconComponent
  className?: string
}) {
  return <Icon className={className} />
}
