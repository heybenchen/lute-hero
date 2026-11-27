import type { CSSProperties, ReactNode } from 'react'

/**
 * The song layout shared by fights and the Final Showdown: every song on one
 * row from tablet width up, and two rows on phones (half the songs per row,
 * rounded up) so nothing scrolls sideways. The actual setlist size owns the
 * desktop column count: the normal six songs fill the width, and Extra Verse
 * (or any future slot-adding genre) only makes the grid denser when present.
 */
export function SongGrid({ count, children }: { count: number; children: ReactNode }) {
  const style = {
    '--song-cols': Math.max(1, count),
    '--song-cols-mobile': Math.max(1, count <= 3 ? count : Math.ceil(count / 2)),
  } as CSSProperties
  return (
    <div className="song-grid" style={style}>
      {children}
    </div>
  )
}
