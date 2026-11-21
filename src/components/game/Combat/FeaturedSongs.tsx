import { useEffect, useRef } from 'react'
import { Player, Monster, DiceRoll } from '@/types'
import type { FeatureRequest } from '@/engine/state'
import { DiceShape } from '@/components/ui/DiceShape'
import { SongCard } from './SongCard'
import { Mic2 } from 'lucide-react'

interface FeaturedSongsProps {
  fighter: Player
  /** Other bards standing on the fight's space. */
  guests: Player[]
  featuredPlayerIds: string[]
  featureRequest: FeatureRequest | null
  monsters: Monster[]
  currentSongId: string | null
  rolls: DiceRoll[]
  /** The fighter can feature a song right now (their turn, a live target, nothing pending). */
  canFeature: boolean
  /** Online play: featuring asks the guest first. */
  online: boolean
  /** This client's bard (online), for the agree / withdraw prompts. */
  myPlayerId: string | null
  onFeature: (guestPlayerId: string, songId: string) => void
  onAnswer: (accept: boolean) => void
}

/**
 * Songs borrowed from other bards on the space: one per bard per fight. A
 * featured song costs the fighter nothing, and a tame splits that monster's
 * Fame and EXP with the bard who lent it. Online, the guest must agree.
 */
export function FeaturedSongs({
  fighter,
  guests,
  featuredPlayerIds,
  featureRequest,
  monsters,
  currentSongId,
  rolls,
  canFeature,
  online,
  myPlayerId,
  onFeature,
  onAnswer,
}: FeaturedSongsProps) {
  if (guests.length === 0) return null

  return (
    <section className="mb-4 border-t border-gold-700/15 pt-4">
      <div className="mb-1 flex items-center gap-2 font-medieval text-xs font-bold uppercase tracking-widest text-parchment-400">
        <Mic2 size={13} className="text-gold-400" aria-hidden="true" />
        Featured songs
      </div>
      <p className="mb-3 text-xs leading-snug text-parchment-500">
        Borrow one song from each bard here. It costs you nothing, and a monster it tames splits its Fame and EXP with them.
      </p>

      {featureRequest && (
        <FeatureRequestPrompt
          request={featureRequest}
          fighter={fighter}
          guests={guests}
          monsters={monsters}
          myPlayerId={myPlayerId}
          onAnswer={onAnswer}
        />
      )}

      <div className="flex flex-col gap-3">
        {guests.map((guest) => {
          const featured = featuredPlayerIds.includes(guest.id)
          const songs = guest.songs.filter((s) => s.slots.some((slot) => slot.dice))
          const pendingForGuest = featureRequest?.guestPlayerId === guest.id
          return (
            <div key={guest.id}>
              <div className="mb-1.5 flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: guest.color }} aria-hidden="true" />
                <span className="font-medieval font-bold text-parchment-200">{guest.name}</span>
                {featured ? (
                  <span className="text-[11px] font-bold uppercase tracking-wide text-parchment-500">Featured</span>
                ) : pendingForGuest ? (
                  <span className="text-[11px] font-bold uppercase tracking-wide text-sky-300">Asked</span>
                ) : (
                  <span className="text-xs text-parchment-500">{online ? 'ask to feature one' : 'feature one'}</span>
                )}
              </div>
              {songs.length === 0 ? (
                <div className="text-xs italic text-parchment-500">No dice to lend.</div>
              ) : (
                <div className="grid grid-cols-[repeat(2,minmax(0,48%))] justify-between gap-y-1.5 min-[430px]:grid-cols-[repeat(3,minmax(0,31.5%))] sm:grid-cols-[repeat(4,minmax(0,23.5%))] md:grid-cols-[repeat(6,minmax(0,15.5%))]">
                  {songs.map((song, idx) => (
                    <SongCard
                      key={song.id}
                      song={{ ...song, used: featured && currentSongId !== song.id }}
                      onPlay={() => onFeature(guest.id, song.id)}
                      disabled={!canFeature || featured}
                      index={idx}
                      rolls={currentSongId === song.id ? rolls : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function FeatureRequestPrompt({
  request,
  fighter,
  guests,
  monsters,
  myPlayerId,
  onAnswer,
}: {
  request: FeatureRequest
  fighter: Player
  guests: Player[]
  monsters: Monster[]
  myPlayerId: string | null
  onAnswer: (accept: boolean) => void
}) {
  const guest = guests.find((g) => g.id === request.guestPlayerId)
  const die = guest?.songs.find((s) => s.id === request.songId)?.slots[0]?.dice
  const target = monsters.find((m) => m.id === request.targetMonsterId)
  const isGuest = !!guest && myPlayerId === guest.id
  const ref = useRef<HTMLDivElement>(null)

  // The guest may be scrolled elsewhere in the fight: bring the ask into view
  useEffect(() => {
    if (isGuest) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [isGuest])

  if (!guest) return null

  const isFighter = myPlayerId === fighter.id
  const dieLabel = die ? (
    <span className="inline-flex items-center gap-1 font-bold">
      <DiceShape type={die.type} /> {die.genre}
    </span>
  ) : 'a song'

  return (
    <div
      ref={ref}
      className="mb-3 flex flex-col gap-2 rounded-lg p-3 text-sm animate-fade-in sm:flex-row sm:items-center sm:justify-between"
      style={{ background: 'rgba(80, 150, 220, 0.1)', border: '1px solid rgba(110, 180, 240, 0.4)' }}
      role={isGuest ? 'alertdialog' : 'status'}
      aria-label="Featured song request"
    >
      <span className="text-parchment-200">
        {isGuest ? (
          <>{fighter.name} wants to feature your {dieLabel} against {target?.name ?? 'a monster'}. You split the rewards if it tames it.</>
        ) : isFighter ? (
          <>Waiting for {guest.name} to agree to feature their {dieLabel}…</>
        ) : (
          <>{fighter.name} asked {guest.name} to feature their {dieLabel}.</>
        )}
      </span>
      {isGuest ? (
        <div className="flex shrink-0 gap-2">
          <button onClick={() => onAnswer(false)} className="btn-secondary min-h-11 flex-1 px-4 text-sm">
            Decline
          </button>
          <button onClick={() => onAnswer(true)} className="btn-primary min-h-11 flex-1 px-4 text-sm">
            Agree
          </button>
        </div>
      ) : isFighter ? (
        <button onClick={() => onAnswer(false)} className="btn-secondary min-h-11 shrink-0 px-4 text-sm">
          Withdraw
        </button>
      ) : null}
    </div>
  )
}
