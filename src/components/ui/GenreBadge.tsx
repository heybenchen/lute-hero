import { Genre } from '@/types'

interface GenreBadgeProps {
  genre: Genre
  className?: string
}

const genreStyles: Record<Genre, string> = {
  Pop: 'genre-pop',
  Rock: 'genre-rock',
  Electronic: 'genre-electronic',
  Classical: 'genre-classical',
  HipHop: 'genre-hiphop',
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
