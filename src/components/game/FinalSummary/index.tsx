import { useMemo } from 'react'
import { useGameStore } from '@/store'
import { Player } from '@/types'
import { calculateFinalRankings } from '@/game-logic/fame/calculator'

interface Award {
  title: string
  emoji: string
  blurb: string
}

interface PlayerSummary {
  player: Player
  rank: number
  fandom: number
  bestHit: { damage: number } | null
  crits: number
  diceCount: number
  strongestDie: string | null
  award: Award
}

const DIE_ORDER = ['d4', 'd6', 'd12', 'd20']

/**
 * Every bard leaves the tour with a superlative. Awards are assigned greedily
 * in priority order so each player gets a distinct title where possible.
 */
function assignAwards(summaries: Omit<PlayerSummary, 'award'>[]): Map<string, Award> {
  const candidates: { award: Award; rankBy: (s: Omit<PlayerSummary, 'award'>) => number }[] = [
    {
      award: { title: 'Crowd Favorite', emoji: '👑', blurb: 'Most adoring fans in the realm' },
      rankBy: (s) => s.player.fame,
    },
    {
      award: { title: 'One-Hit Wonder', emoji: '💥', blurb: 'Biggest single hit of the showdown' },
      rankBy: (s) => s.bestHit?.damage ?? 0,
    },
    {
      award: { title: 'Beast Buster', emoji: '🗡️', blurb: 'Most monsters converted to fans' },
      rankBy: (s) => s.player.monstersDefeated,
    },
    {
      award: { title: 'Lucky Charm', emoji: '🍀', blurb: 'Most encore crits in the showdown' },
      rankBy: (s) => s.crits,
    },
    {
      award: { title: 'Gear Head', emoji: '🎲', blurb: 'Toured with the biggest dice bag' },
      rankBy: (s) => s.diceCount,
    },
    {
      award: { title: 'Deep Pockets', emoji: '💰', blurb: 'Retired with the most unspent EXP' },
      rankBy: (s) => s.player.exp,
    },
    {
      award: { title: 'Muse Touched', emoji: '✨', blurb: 'Hoarded the most Inspiration' },
      rankBy: (s) => s.player.inspiration,
    },
  ]

  const assigned = new Map<string, Award>()
  for (const { award, rankBy } of candidates) {
    if (assigned.size === summaries.length) break
    const eligible = summaries.filter((s) => !assigned.has(s.player.id))
    if (eligible.length === 0) break
    const top = eligible.reduce((best, s) => (rankBy(s) > rankBy(best) ? s : best), eligible[0])
    assigned.set(top.player.id, award)
  }
  // Fallback for any bard left without a title
  summaries.forEach((s) => {
    if (!assigned.has(s.player.id)) {
      assigned.set(s.player.id, { title: 'Road Warrior', emoji: '🎸', blurb: 'Survived the whole tour' })
    }
  })
  return assigned
}

export function FinalSummary() {
  const players = useGameStore((state) => state.players)
  const showdownFandom = useGameStore((state) => state.showdownFandom)
  const showdownBestHit = useGameStore((state) => state.showdownBestHit)
  const showdownCrits = useGameStore((state) => state.showdownCrits)
  const currentRound = useGameStore((state) => state.currentRound)
  const dispatch = useGameStore((state) => state.dispatch)

  const summaries: PlayerSummary[] = useMemo(() => {
    const ranked = calculateFinalRankings(players)
    const base = ranked.map((player, idx) => {
      const dice = player.songs.flatMap((s) => s.slots.map((slot) => slot.dice)).filter((d) => d !== null)
      const strongestDie = dice.length > 0
        ? dice.reduce((best, d) => (DIE_ORDER.indexOf(d!.type) > DIE_ORDER.indexOf(best!.type) ? d : best), dice[0])!.type
        : null
      return {
        player,
        rank: idx + 1,
        fandom: showdownFandom[player.id] || 0,
        bestHit: showdownBestHit[player.id] || null,
        crits: showdownCrits[player.id] || 0,
        diceCount: dice.length,
        strongestDie,
      }
    })
    const awards = assignAwards(base)
    return base.map((s) => ({ ...s, award: awards.get(s.player.id)! }))
  }, [players, showdownFandom, showdownBestHit, showdownCrits])

  const handleNewGame = () => {
    dispatch({ type: 'RESET_GAME' })
  }

  if (summaries.length === 0) return null
  const winner = summaries[0]

  return (
    <div className="min-h-[100dvh] overflow-y-auto py-8 px-4 relative" style={{ background: 'radial-gradient(ellipse at 50% -10%, #241833 0%, #0d0a07 55%)' }}>
      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="text-xs font-medieval uppercase tracking-[0.5em] text-parchment-500 mb-2">The Tour Ends</div>
          <h1 className="font-display text-4xl sm:text-5xl text-gold-400 mb-2" style={{ textShadow: '0 0 30px rgba(212, 168, 83, 0.35)' }}>
            Tour Summary
          </h1>
          <p className="text-sm text-parchment-400">
            {currentRound} round{currentRound !== 1 ? 's' : ''} on the road · the Silence broken ·{' '}
            <span className="text-gold-300 font-bold">{winner.player.name}</span> crowned Legend of the Realm 👑
          </p>
        </div>

        {/* Player stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-8">
          {summaries.map((s, idx) => (
            <div
              key={s.player.id}
              className="card-ornate p-5 animate-slide-up relative overflow-hidden"
              style={{
                animationDelay: `${idx * 150}ms`,
                animationFillMode: 'both',
                border: s.rank === 1 ? '2px solid rgba(240, 215, 140, 0.55)' : undefined,
                boxShadow: s.rank === 1 ? '0 0 30px rgba(240, 215, 140, 0.12)' : undefined,
              }}
            >
              {/* Rank ribbon */}
              <div
                className="absolute top-0 right-0 px-3 py-1 text-xs font-display rounded-bl-lg"
                style={{
                  background: s.rank === 1 ? 'rgba(240, 215, 140, 0.9)' : s.rank === 2 ? 'rgba(192,192,192,0.75)' : s.rank === 3 ? 'rgba(205,127,50,0.75)' : 'rgba(255,255,255,0.12)',
                  color: s.rank <= 3 ? '#1a1410' : '#d9c49f',
                }}
              >
                #{s.rank}
              </div>

              {/* Identity + award */}
              <div className="flex items-center gap-3 mb-4">
                <div className="player-avatar w-14 h-14 text-2xl flex-shrink-0" style={{ backgroundColor: s.player.color }}>
                  {s.player.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-medieval text-lg font-bold text-gold-300 truncate">
                    {s.rank === 1 && '👑 '}{s.player.name}
                  </div>
                  <div
                    className="inline-flex items-center gap-1.5 text-xs font-medieval font-bold px-2.5 py-1 rounded-full mt-1"
                    style={{ background: 'rgba(212, 168, 83, 0.1)', border: '1px solid rgba(212, 168, 83, 0.3)', color: '#e6c35a' }}
                    title={s.award.blurb}
                  >
                    <span>{s.award.emoji}</span> {s.award.title}
                  </div>
                  <div className="text-[11px] text-parchment-500 mt-0.5">{s.award.blurb}</div>
                </div>
              </div>

              {/* Headline number */}
              <div className="text-center mb-4 py-2 rounded-lg" style={{ background: 'rgba(212, 168, 83, 0.06)', border: '1px solid rgba(212, 168, 83, 0.15)' }}>
                <span className="text-3xl font-bold text-gold-400 tabular-nums" style={{ textShadow: '0 0 12px rgba(212,168,83,0.3)' }}>
                  {s.player.fame}
                </span>
                <span className="block text-[10px] text-parchment-500 uppercase tracking-widest mt-0.5">
                  Total fans · {s.player.fame - s.fandom} on tour + {s.fandom} in the showdown
                </span>
              </div>

              {/* Fun stats grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <StatRow icon="🗡️" label="Monsters bested" value={`${s.player.monstersDefeated}`} />
                <StatRow icon="💥" label="Biggest hit" value={s.bestHit ? `${s.bestHit.damage}` : '—'} />
                <StatRow icon="🎲" label="Dice collected" value={`${s.diceCount}`} detail={s.strongestDie ? `best: ${s.strongestDie}` : undefined} />
                <StatRow icon="⚡" label="Showdown crits" value={`${s.crits}`} />
                <StatRow icon="💰" label="EXP unspent" value={`${s.player.exp}`} />
              </div>
            </div>
          ))}
        </div>

        {/* New game */}
        <div className="text-center animate-fade-in" style={{ animationDelay: '800ms', animationFillMode: 'both' }}>
          <button onClick={handleNewGame} className="btn-primary text-lg px-12 py-4">
            🎵 Start a New Tour
          </button>
        </div>
      </div>
    </div>
  )
}

function StatRow({ icon, label, value, detail }: { icon: string; label: string; value: string; detail?: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-base leading-tight">{icon}</span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold text-parchment-200 tabular-nums">{value}</span>
          <span className="text-xs text-parchment-500">{label}</span>
        </div>
        {detail && <div className="text-[10px] text-parchment-600 truncate italic">{detail}</div>}
      </div>
    </div>
  )
}
