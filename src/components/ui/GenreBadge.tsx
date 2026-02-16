import { Genre } from '@/types'

interface GenreBadgeProps {
  genre: Genre
  className?: string
}

const genreStyles: Record<Genre, string> = {
  Ballad: 'genre-ballad',
  Folk: 'genre-folk',
  Hymn: 'genre-hymn',
  Shanty: 'genre-shanty',
}

export function GenreBadge({ genre, className = '' }: GenreBadgeProps) {
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-bold ${genreStyles[genre]} ${className}`}
    >
      {genre}
    </span>
  )
}
