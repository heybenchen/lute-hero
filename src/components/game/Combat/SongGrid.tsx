import type { CSSProperties, ReactNode } from 'react'

/**
 * The song layout shared by fights and the Final Showdown: every song on one
 * row from tablet width up, and two rows on phones (half the songs per row,
 * rounded up) so nothing scrolls sideways. Small sets keep card-sized columns
 * rather than stretching across the screen.
 */
export function SongGrid({ count, children }: { count: number; children: ReactNode }) {
  const style = {
    '--song-cols': Math.max(6, count),
    '--song-cols-mobile': Math.max(3, Math.ceil(count / 2)),
  } as CSSProperties
  return (
    <div className="song-grid" style={style}>
      {children}
    </div>
  )
}
