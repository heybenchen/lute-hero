import { useEffect, useMemo, useState } from 'react'
import { Music, Search } from 'lucide-react'
import {
  AUDIT_GAMES,
  BASELINE_WIN,
  GROUP_LABEL,
  PARITY,
  TIMING_LABEL,
  songbookEntries,
  type SongbookEntry,
  type StyleGroup,
} from './data'

type GroupFilter = 'all' | StyleGroup
type SortKey = 'catalog' | 'price' | 'strength' | 'name'

const GROUP_FILTERS: { key: GroupFilter; label: string }[] = [
  { key: 'all', label: 'All styles' },
  { key: 'original', label: GROUP_LABEL.original },
  { key: 'lab', label: GROUP_LABEL.lab },
]

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'catalog', label: 'Catalog order' },
  { key: 'price', label: 'Price, low to high' },
  { key: 'strength', label: 'Strength, high to low' },
  { key: 'name', label: 'Name' },
]

/** Bar scale: where the strength bar starts and ends, in win %. */
const BAR_MIN = 25
const BAR_MAX = 45
const pct = (win: number) => `${Math.max(0, Math.min(100, ((win - BAR_MIN) / (BAR_MAX - BAR_MIN)) * 100))}%`

function matches(e: SongbookEntry, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return [e.name, e.rule, e.flavor, e.id, e.note ?? '', TIMING_LABEL[e.timing], GROUP_LABEL[e.group]]
    .some((s) => s.toLowerCase().includes(q))
}

function sortEntries(list: SongbookEntry[], sort: SortKey): SongbookEntry[] {
  const out = [...list]
  if (sort === 'price') out.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name))
  if (sort === 'strength') out.sort((a, b) => b.win - a.win || a.name.localeCompare(b.name))
  if (sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}

function StrengthBar({ win }: { win: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-stone-500">Wins in simulation</span>
        <span className="font-semibold text-stone-200">{win.toFixed(1)}%</span>
      </div>
      <div
        className="relative mt-1 h-2 rounded-full bg-stone-800"
        role="img"
        aria-label={`Wins ${win.toFixed(1)} percent of simulated games; a fair share is ${PARITY.toFixed(1)} percent`}
      >
        <div className="absolute inset-y-0 left-0 rounded-full bg-amber-500/70" style={{ width: pct(win) }} />
        <div className="absolute -inset-y-0.5 w-px bg-stone-300/70" style={{ left: pct(PARITY) }} aria-hidden="true" />
      </div>
    </div>
  )
}

function StyleCard({ e }: { e: SongbookEntry }) {
  const changed = e.was !== e.price
  return (
    <article id={e.id} className="flex flex-col rounded-xl border border-white/10 bg-stone-900/60 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl font-bold text-amber-100">{e.name}</h3>
          <p className="mt-0.5 text-sm italic text-stone-500">{e.flavor}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-sm font-semibold text-amber-200">
            {e.price} EXP
          </div>
          {changed && <div className="mt-1 text-[11px] text-stone-500">was {e.was} EXP</div>}
        </div>
      </header>

      <p className="mt-3 text-sm leading-relaxed text-stone-200">{e.rule}</p>
      {e.note && <p className="mt-2 text-xs leading-relaxed text-stone-400">{e.note}</p>}

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-stone-400">{TIMING_LABEL[e.timing]}</span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-stone-400">{GROUP_LABEL[e.group]}</span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-stone-500">{e.id}</span>
      </div>

      <div className="mt-4">
        <StrengthBar win={e.win} />
      </div>

      <details className="mt-3 text-xs">
        <summary className="cursor-pointer select-none text-stone-500 transition hover:text-amber-300">
          Settings ({e.settings.length})
        </summary>
        <dl className="mt-2 space-y-1">
          {e.settings.map((s) => (
            <div key={s.key} className="flex justify-between gap-3">
              <dt className="text-stone-400">{s.label}</dt>
              <dd className="font-mono text-stone-200">{s.value}</dd>
            </div>
          ))}
        </dl>
      </details>
    </article>
  )
}

export function Songbook() {
  const entries = useMemo(() => songbookEntries(), [])
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<GroupFilter>('all')
  const [sort, setSort] = useState<SortKey>('catalog')

  useEffect(() => {
    document.title = 'Songbook - Lute Hero'
  }, [])

  const shown = useMemo(
    () => sortEntries(entries.filter((e) => (group === 'all' || e.group === group) && matches(e, query.trim())), sort),
    [entries, group, query, sort],
  )
  const counts = useMemo(
    () => ({
      all: entries.length,
      original: entries.filter((e) => e.group === 'original').length,
      lab: entries.filter((e) => e.group === 'lab').length,
    }),
    [entries],
  )
  const wins = entries.map((e) => e.win)
  const low = entries.reduce((a, b) => (b.win < a.win ? b : a))
  const high = entries.reduce((a, b) => (b.win > a.win ? b : a))

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-8 border-b border-white/10 pb-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-amber-500/80">
              <Music size={14} aria-hidden="true" /> Lute Hero
            </div>
            <nav className="flex items-center gap-4 text-xs text-stone-500">
              <a href="/bestiary" className="transition hover:text-amber-300">Bestiary</a>
              <a href="/" className="transition hover:text-amber-300">Back to the game</a>
            </nav>
          </div>
          <h1 className="mt-2 font-serif text-4xl font-black tracking-tight text-amber-100 sm:text-5xl">Songbook</h1>
          <p className="mt-2 max-w-xl text-sm text-stone-400">
            Every play style a bard can learn in the Studio: what it does, what it costs, the settings behind it, and
            how strong it is in simulation.
          </p>
        </header>

        <section aria-labelledby="how" className="mb-8 rounded-xl border border-white/10 bg-stone-900/40 p-4 sm:p-5">
          <h2 id="how" className="font-serif text-lg font-bold text-amber-100">How styles work</h2>
          <ul className="mt-2 grid gap-x-8 gap-y-1.5 text-sm text-stone-300 sm:grid-cols-2">
            <li>A style changes how <strong className="text-stone-100">every</strong> song a bard plays.</li>
            <li>A bard holds at most <strong className="text-stone-100">2</strong> styles; buying a third replaces one.</li>
            <li>The Studio shelf offers 2 styles at a time. Inspiration redraws it.</li>
            <li>Prices are in EXP, and bards usually have a first style by round 5.</li>
            <li><strong className="text-stone-100">Once per turn</strong> styles fire on their own the first time they apply.</li>
            <li><strong className="text-stone-100">Can&apos;t crit</strong> bonuses add on top of the roll and never change the face.</li>
            <li>Featured songs borrowed from another bard play without styles.</li>
            <li>Every number here is a setting in the playtest console, so the game can be re-tuned.</li>
          </ul>
        </section>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(ev) => setQuery(ev.target.value)}
              placeholder="Search styles, rules, Inspiration, crit…"
              aria-label="Search styles"
              className="w-full rounded-lg border border-white/10 bg-stone-900/60 py-2.5 pl-9 pr-3 text-sm text-stone-100 placeholder:text-stone-600 focus:border-amber-500/40 focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-400">
            Sort
            <select
              value={sort}
              onChange={(ev) => setSort(ev.target.value as SortKey)}
              className="rounded-lg border border-white/10 bg-stone-900/60 px-3 py-2.5 text-sm text-stone-200 focus:border-amber-500/40 focus:outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by group">
          {GROUP_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={group === f.key}
              onClick={() => setGroup(f.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${
                group === f.key
                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-200'
                  : 'border-white/10 text-stone-400 hover:bg-white/5'
              }`}
            >
              {f.label} <span className="text-xs text-stone-500">{counts[f.key]}</span>
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-stone-900/40 p-8 text-center text-sm text-stone-500">
            No style matches &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((e) => (
              <StyleCard key={e.id} e={e} />
            ))}
          </div>
        )}

        <section aria-labelledby="table" className="mt-10">
          <h2 id="table" className="font-serif text-lg font-bold text-amber-100">At a glance</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-stone-900/60 text-xs uppercase tracking-wider text-stone-500">
                    <th className="py-3 pl-4 pr-2 font-medium">Style</th>
                    <th className="px-2 py-3 text-right font-medium">Price</th>
                    <th className="px-2 py-3 font-medium">Triggers</th>
                    <th className="px-2 py-3 font-medium">Group</th>
                    <th className="py-3 pl-2 pr-4 text-right font-medium">Wins</th>
                  </tr>
                </thead>
                <tbody>
                  {sortEntries(entries, sort === 'catalog' ? 'name' : sort).map((e) => (
                    <tr key={e.id} className="border-b border-white/5 last:border-0">
                      <td className="py-2.5 pl-4 pr-2">
                        <a href={`#${e.id}`} className="font-medium text-stone-100 transition hover:text-amber-300">{e.name}</a>
                      </td>
                      <td className="px-2 py-2.5 text-right text-stone-300">{e.price} EXP</td>
                      <td className="px-2 py-2.5 text-stone-400">{TIMING_LABEL[e.timing]}</td>
                      <td className="px-2 py-2.5 text-stone-400">{GROUP_LABEL[e.group]}</td>
                      <td className="py-2.5 pl-2 pr-4 text-right text-stone-200">{e.win.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section aria-labelledby="strength" className="mt-10 rounded-xl border border-white/10 bg-stone-900/40 p-4 sm:p-5">
          <h2 id="strength" className="font-serif text-lg font-bold text-amber-100">How strength is measured</h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-300">
            Smart-bot players play {AUDIT_GAMES} three-bard games per style through the real rules and the Final Showdown.
            The tested bard buys the style in round 5 at its real price. That is when bots really buy their first one.
            The other two bards shop for styles too, so a style is judged against what bots naturally buy.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-300">
            A fair share at a three-bard table is {PARITY.toFixed(1)}% of games (a bard with no style wins{' '}
            {BASELINE_WIN.toFixed(1)}%). Results move by about ±3.5 points from run to run, so only gaps larger than about
            4 points mean anything. Today the styles span {Math.min(...wins).toFixed(1)}% ({low.name}) to{' '}
            {Math.max(...wins).toFixed(1)}% ({high.name}).
          </p>
          <p className="mt-2 text-xs text-stone-500">
            These are bot results, not player results: treat them as a guide to balance, not a ranking of fun.
          </p>
        </section>
      </div>
    </div>
  )
}
