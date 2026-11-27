import { Element } from '@/types'

interface ElementBadgeProps {
  element: Element
  className?: string
}

const elementClasses: Record<Element, string> = {
  Ballad: 'element-ballad',
  Folk: 'element-folk',
  Hymn: 'element-hymn',
  Shanty: 'element-shanty',
}

export function ElementBadge({ element, className = '' }: ElementBadgeProps) {
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-bold ${elementClasses[element]} ${className}`}
    >
      {element}
    </span>
  )
}
