import { Genre } from '@/types'
import { GENRE_THEME } from '@/data/genreTheme'
import { ELEMENT_MATCHUPS } from '@/data/resistances'

/**
 * A compass-style diagram of the genre/element type chart. Opposing elements
 * face each other across the cross; the dashed link between them marks the
 * mutual 0× immunity, while each node's green "2×" badge marks the matching
 * genre that is super effective against that monster. Layout and colors are
 * derived from ELEMENT_MATCHUPS so the picture always matches the rules.
 */

// Fixed compass geometry for the four-element system.
const VIEW = 340
const C = VIEW / 2 // center
const R = 44 // node radius
const SPAN = 118 // center-to-node distance

type Slot = 'top' | 'bottom' | 'left' | 'right'
const POS: Record<Slot, { x: number; y: number }> = {
  top: { x: C, y: C - SPAN },
  bottom: { x: C, y: C + SPAN },
  left: { x: C - SPAN, y: C },
  right: { x: C + SPAN, y: C },
}

/** Place the two opposing pairs across the compass from the derived matchups. */
function buildLayout() {
  const first = ELEMENT_MATCHUPS[0]
  const firstOpp = first.immuneTo
  const second = ELEMENT_MATCHUPS.find(
    (m) => m.element !== first.element && m.element !== firstOpp,
  )!
  const secondOpp = second.immuneTo

  const slots: Record<Genre, Slot> = {
    [first.element]: 'top',
    [firstOpp]: 'bottom',
    [second.element]: 'left',
    [secondOpp]: 'right',
  } as Record<Genre, Slot>

  const links: [Genre, Genre][] = [
    [first.element, firstOpp],
    [second.element, secondOpp],
  ]
  return { slots, links }
}

export function TypeChart({ className = '' }: { className?: string }) {
  const { slots, links } = buildLayout()

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="w-full h-auto max-w-[340px] mx-auto"
        role="img"
        aria-label="Element type chart: opposing elements are immune (0×) to each other; each element takes 2× from its matching genre."
      >
        <defs>
          <radialGradient id="tc-hub" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(212, 168, 83, 0.18)" />
            <stop offset="100%" stopColor="rgba(212, 168, 83, 0)" />
          </radialGradient>
        </defs>

        {/* Immunity links between opposing pairs */}
        {links.map(([a, b]) => {
          const pa = POS[slots[a]]
          const pb = POS[slots[b]]
          const dx = pb.x - pa.x
          const dy = pb.y - pa.y
          const len = Math.hypot(dx, dy)
          const ux = dx / len
          const uy = dy / len
          const x1 = pa.x + ux * R
          const y1 = pa.y + uy * R
          const x2 = pb.x - ux * R
          const y2 = pb.y - uy * R
          // Pill sits away from the crossing point, toward node `a`.
          const px = x1 + (x2 - x1) * 0.3
          const py = y1 + (y2 - y1) * 0.3
          return (
            <g key={`${a}-${b}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(203, 213, 225, 0.55)"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <g transform={`translate(${px}, ${py})`}>
                <rect
                  x={-17}
                  y={-11}
                  width={34}
                  height={22}
                  rx={11}
                  fill="#241b12"
                  stroke="rgba(203, 213, 225, 0.6)"
                  strokeWidth={1}
                />
                <text
                  x={0}
                  y={1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={12}
                  fontWeight={700}
                  fill="#cbd5e1"
                >
                  0×
                </text>
              </g>
            </g>
          )
        })}

        {/* Center medallion masks the crossing */}
        <circle cx={C} cy={C} r={26} fill="url(#tc-hub)" />
        <circle
          cx={C}
          cy={C}
          r={12}
          fill="#241b12"
          stroke="rgba(212, 168, 83, 0.4)"
          strokeWidth={1}
        />
        <text
          x={C}
          y={C + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={11}
          fill="#d4a853"
        >
          ♪
        </text>

        {/* Element nodes */}
        {ELEMENT_MATCHUPS.map((m) => {
          const p = POS[slots[m.element]]
          const theme = GENRE_THEME[m.element]
          return (
            <g key={m.element}>
              <circle
                cx={p.x}
                cy={p.y}
                r={R}
                fill={`rgba(${theme.rgb}, 0.16)`}
                stroke={theme.color}
                strokeWidth={2.5}
              />
              <text
                x={p.x}
                y={p.y - 8}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={26}
              >
                {theme.emoji}
              </text>
              <text
                x={p.x}
                y={p.y + 22}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={12}
                fontWeight={700}
                fill="#f0e0c0"
              >
                {m.element}
              </text>

              {/* 2× super-effective badge (matching genre) */}
              <g transform={`translate(${p.x + R - 6}, ${p.y - R + 6})`}>
                <circle r={14} fill="#1c2a17" stroke="#4caf50" strokeWidth={1.5} />
                <text
                  x={0}
                  y={1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill="#86e08a"
                >
                  2×
                </text>
              </g>
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="mt-3 flex flex-col gap-1.5 text-xs text-parchment-300">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold flex-shrink-0"
            style={{ background: '#1c2a17', border: '1.5px solid #4caf50', color: '#86e08a' }}
          >
            2×
          </span>
          <span>Hit a monster with its <span className="text-green-300 font-bold">matching</span> element for double damage.</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold flex-shrink-0"
            style={{ background: '#241b12', border: '1.5px dashed rgba(203, 213, 225, 0.6)', color: '#cbd5e1' }}
          >
            0×
          </span>
          <span>The <span className="text-slate-300 font-bold">opposite</span> element is useless — the monster is immune.</span>
        </div>
      </div>
    </div>
  )
}
