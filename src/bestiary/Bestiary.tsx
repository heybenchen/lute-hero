import { useEffect, useMemo, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Flame, Waves, Wind, Trees, Plus, X, Eye, EyeOff, Trash2,
  Search, Upload, ChevronRight, Skull, Save, Music,
} from 'lucide-react'
import {
  BESTIARY_TYPES,
  buildLevels,
  hpAtLevel,
  type BestiaryType,
  type Monster,
} from './data'

/* ------------------------------------------------------------------ */
/*  Elemental identity: colour + icon (effects come from the roster).  */
/*  Colour classes are full literals so Tailwind's JIT can see them.   */
/* ------------------------------------------------------------------ */
interface TypeTheme {
  label: string
  Icon: LucideIcon
  badge: string
  iconText: string
}
const TYPES: Record<BestiaryType, TypeTheme> = {
  fire: {
    label: 'Fire',
    Icon: Flame,
    badge: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
    iconText: 'text-orange-400',
  },
  sea: {
    label: 'Sea',
    Icon: Waves,
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
    iconText: 'text-cyan-400',
  },
  sky: {
    label: 'Sky',
    Icon: Wind,
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
    iconText: 'text-indigo-400',
  },
  forest: {
    label: 'Forest',
    Icon: Trees,
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    iconText: 'text-emerald-400',
  },
}

/* ------------------------------------------------------------------ */
/*  Backend (Vercel Node functions in api/monsters/*)                  */
/* ------------------------------------------------------------------ */
type NewMonster = Pick<Monster, 'name' | 'type' | 'baseHp' | 'tagline'>

const api = {
  list: (): Promise<Monster[]> => fetch('/api/monsters').then((r) => r.json()),
  create: (m: NewMonster): Promise<Monster> =>
    fetch('/api/monsters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(m),
    }).then((r) => r.json()),
  update: (id: string, m: Partial<Monster>): Promise<Monster> =>
    fetch(`/api/monsters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(m),
    }).then((r) => r.json()),
  remove: (id: string): Promise<Response> =>
    fetch(`/api/monsters/${id}`, { method: 'DELETE' }),
}

/* Downscale uploaded images so they fit comfortably in storage. */
function fileToDataUrl(file: File, maxDim = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/* ------------------------------------------------------------------ */
/*  Small pieces                                                       */
/* ------------------------------------------------------------------ */
function TypeBadge({ type }: { type: BestiaryType }) {
  const t = TYPES[type]
  const Icon = t.Icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${t.badge}`}
    >
      <Icon size={12} strokeWidth={2.5} />
      {t.label}
    </span>
  )
}

function Portrait({
  url,
  type,
  size = 'h-11 w-11',
}: {
  url: string
  type: BestiaryType
  size?: string
}) {
  const t = TYPES[type]
  const Icon = t.Icon
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`${size} shrink-0 rounded-md object-cover ring-1 ring-white/10`}
      />
    )
  }
  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-md bg-stone-800 ring-1 ring-white/10`}
    >
      <Icon size={18} className={t.iconText} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Detail drawer                                                      */
/* ------------------------------------------------------------------ */
function DetailDrawer({
  monster,
  onClose,
  onChange,
  onDelete,
}: {
  monster: Monster
  onClose: () => void
  onChange: (m: Monster) => void
  onDelete: (id: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const patch = (fields: Partial<Monster>) => onChange({ ...monster, ...fields })

  const patchLevel = (idx: number, fields: Partial<Monster['levels'][number]>) => {
    const levels = monster.levels.map((l, i) => (i === idx ? { ...l, ...fields } : l))
    patch({ levels })
  }
  const addLevel = () => {
    const next = monster.levels.length + 1
    patch({
      levels: [
        ...monster.levels,
        { level: next, hp: hpAtLevel(monster.baseHp, next), effect: '' },
      ],
    })
  }
  const removeLevel = (idx: number) =>
    patch({ levels: monster.levels.filter((_, i) => i !== idx) })

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      patch({ imageUrl: await fileToDataUrl(file) })
    } catch {
      /* ignore */
    }
    setUploading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-stone-950 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-stone-950/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-stone-500">
            <Skull size={14} /> Statblock
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-stone-400 hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-6">
          <div className="flex gap-4">
            <Portrait url={monster.imageUrl} type={monster.type} size="h-24 w-24" />
            <div className="flex-1">
              <input
                value={monster.name}
                onChange={(e) => patch({ name: e.target.value })}
                className="w-full bg-transparent font-serif text-2xl font-bold text-amber-100 focus:outline-none"
              />
              <input
                value={monster.tagline}
                onChange={(e) => patch({ tagline: e.target.value })}
                placeholder="Tagline…"
                className="mt-1 w-full bg-transparent text-sm italic text-stone-400 focus:outline-none"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {BESTIARY_TYPES.map((k) => {
                  const active = monster.type === k
                  const T = TYPES[k]
                  const Icon = T.Icon
                  return (
                    <button
                      key={k}
                      onClick={() => patch({ type: k })}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
                        active ? T.badge : 'border-white/10 text-stone-500 hover:text-stone-300'
                      }`}
                    >
                      <Icon size={12} /> {T.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-stone-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <Upload size={14} /> {uploading ? 'Processing…' : 'Upload image'}
            </button>
            {monster.imageUrl && (
              <button
                onClick={() => patch({ imageUrl: '' })}
                className="text-sm text-stone-500 hover:text-red-300"
              >
                Remove
              </button>
            )}
            <input
              value={monster.imageUrl.startsWith('data:') ? '' : monster.imageUrl}
              onChange={(e) => patch({ imageUrl: e.target.value })}
              placeholder="…or paste an image URL"
              className="min-w-[10rem] flex-1 rounded-md border border-white/10 bg-transparent px-3 py-1.5 text-sm text-stone-300 placeholder:text-stone-600 focus:border-amber-500/40 focus:outline-none"
            />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <label className="text-xs uppercase tracking-widest text-stone-500">Base HP</label>
            <input
              type="number"
              value={monster.baseHp}
              onChange={(e) => patch({ baseHp: parseInt(e.target.value || '0', 10) })}
              className="w-24 rounded-md border border-white/10 bg-transparent px-3 py-1.5 text-lg font-semibold text-amber-100 focus:border-amber-500/40 focus:outline-none"
            />
            <button
              onClick={() => patch({ levels: buildLevels(monster.baseHp, monster.type) })}
              className="ml-auto text-xs text-stone-500 hover:text-amber-300"
            >
              Reset levels from base
            </button>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-serif text-lg text-amber-100">By level</h3>
              <button
                onClick={addLevel}
                className="inline-flex items-center gap-1 text-sm text-amber-300 hover:text-amber-200"
              >
                <Plus size={14} /> Add level
              </button>
            </div>
            <div className="space-y-3">
              {monster.levels.map((lvl, idx) => (
                <div key={idx} className="rounded-lg border border-white/10 bg-stone-900/60 p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/15 text-sm font-bold text-amber-300">
                      {lvl.level}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs uppercase tracking-wide text-stone-500">HP</span>
                      <input
                        type="number"
                        value={lvl.hp}
                        onChange={(e) =>
                          patchLevel(idx, { hp: parseInt(e.target.value || '0', 10) })
                        }
                        className="w-20 rounded border border-white/10 bg-transparent px-2 py-1 text-sm font-semibold text-stone-100 focus:border-amber-500/40 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => removeLevel(idx)}
                      className="ml-auto rounded p-1 text-stone-600 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <textarea
                    value={lvl.effect}
                    onChange={(e) => patchLevel(idx, { effect: e.target.value })}
                    placeholder="Additional effect at this level…"
                    rows={2}
                    className="mt-2 w-full resize-none rounded border border-white/10 bg-transparent px-2 py-1.5 text-sm text-stone-300 placeholder:text-stone-600 focus:border-amber-500/40 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-4">
            <button
              onClick={() => onDelete(monster.id)}
              className="inline-flex items-center gap-2 rounded-md border border-red-500/30 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/40"
            >
              <Trash2 size={14} /> Delete this monster
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Add form                                                           */
/* ------------------------------------------------------------------ */
function AddDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (m: NewMonster) => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<BestiaryType>('fire')
  const [baseHp, setBaseHp] = useState('50')
  const [tagline, setTagline] = useState('')

  const submit = () => {
    if (!name.trim()) return
    onAdd({
      name: name.trim(),
      type,
      baseHp: Number(baseHp) || 0,
      tagline: tagline.trim(),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-stone-950 p-6 shadow-2xl">
        <h2 className="mb-4 font-serif text-xl text-amber-100">New monster</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-stone-500">
              Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="e.g. Bruce Springsteam"
              className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-stone-100 placeholder:text-stone-600 focus:border-amber-500/40 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-stone-500">
              Element
            </label>
            <div className="flex flex-wrap gap-2">
              {BESTIARY_TYPES.map((k) => {
                const T = TYPES[k]
                const Icon = T.Icon
                const active = type === k
                return (
                  <button
                    key={k}
                    onClick={() => setType(k)}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition ${
                      active ? T.badge : 'border-white/10 text-stone-500 hover:text-stone-300'
                    }`}
                  >
                    <Icon size={13} /> {T.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-stone-500">
              Base HP
            </label>
            <input
              type="number"
              value={baseHp}
              onChange={(e) => setBaseHp(e.target.value)}
              className="w-28 rounded-md border border-white/10 bg-transparent px-3 py-2 text-stone-100 focus:border-amber-500/40 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-stone-500">
              Tagline
            </label>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="One-liner…"
              className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-stone-100 placeholder:text-stone-600 focus:border-amber-500/40 focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-stone-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            <Save size={14} /> Add to bestiary
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
type Filter = 'all' | BestiaryType

export function Bestiary() {
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [showHidden, setShowHidden] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    api
      .list()
      .then((data) => setMonsters(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  // Debounced per-monster persistence so edits don't POST on every keystroke.
  const monstersRef = useRef<Monster[]>(monsters)
  monstersRef.current = monsters
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const scheduleSave = (id: string) => {
    clearTimeout(saveTimers.current[id])
    saveTimers.current[id] = setTimeout(() => {
      const latest = monstersRef.current.find((m) => m.id === id)
      if (latest) void api.update(id, latest)
    }, 500)
  }

  const updateMonster = (m: Monster) => {
    setMonsters((ms) => ms.map((x) => (x.id === m.id ? m : x)))
    scheduleSave(m.id)
  }
  const deleteMonster = (id: string) => {
    setMonsters((ms) => ms.filter((x) => x.id !== id))
    setSelectedId(null)
    void api.remove(id)
  }
  const addMonster = async (payload: NewMonster) => {
    const created = await api.create(payload)
    if (created && created.id) setMonsters((ms) => [created, ...ms])
  }
  const toggleHidden = (id: string) => {
    const target = monsters.find((m) => m.id === id)
    if (target) updateMonster({ ...target, hidden: !target.hidden })
  }

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: monsters.length, fire: 0, sea: 0, sky: 0, forest: 0 }
    monsters.forEach((m) => (c[m.type] += 1))
    return c
  }, [monsters])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return monsters.filter((m) => {
      if (!showHidden && m.hidden) return false
      if (filter !== 'all' && m.type !== filter) return false
      if (q && !`${m.name} ${m.tagline}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [monsters, query, filter, showHidden])

  const selected = monsters.find((m) => m.id === selectedId) || null

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 text-stone-500">
        Summoning the bestiary…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-8 border-b border-white/10 pb-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-amber-500/80">
              <Music size={13} /> Battle of the Bands · Monster Manual
            </div>
            <a href="/" className="text-xs text-stone-500 transition hover:text-amber-300">
              ← Lute Hero
            </a>
          </div>
          <h1 className="mt-2 font-serif text-4xl font-black tracking-tight text-amber-100 sm:text-5xl">
            The Bestiary
          </h1>
          <p className="mt-2 max-w-xl text-sm text-stone-400">
            Every pun-named horror in the setlist. Search, filter, hide the ones you're saving, and
            open any card for its full statblock.
          </p>
        </header>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search names and taglines…"
              className="w-full rounded-lg border border-white/10 bg-stone-900/60 py-2.5 pl-9 pr-3 text-sm text-stone-100 placeholder:text-stone-600 focus:border-amber-500/40 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowHidden((v) => !v)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-stone-900/60 px-3 py-2.5 text-sm text-stone-300 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            {showHidden ? <Eye size={15} /> : <EyeOff size={15} />}
            {showHidden ? 'Showing hidden' : 'Hiding hidden'}
          </button>
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-stone-950 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            <Plus size={16} /> Add monster
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {(['all', ...BESTIARY_TYPES] as Filter[]).map((k) => {
            const active = filter === k
            const label = k === 'all' ? 'All' : TYPES[k].label
            const Icon = k === 'all' ? null : TYPES[k].Icon
            return (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${
                  active
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-200'
                    : 'border-white/10 text-stone-400 hover:text-stone-200'
                }`}
              >
                {Icon && <Icon size={13} />}
                {label}
                <span className="text-xs text-stone-500">{counts[k]}</span>
              </button>
            )
          })}
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-stone-900/60 text-xs uppercase tracking-wider text-stone-500">
                  <th className="py-3 pl-4 pr-2 font-medium">Monster</th>
                  <th className="px-2 py-3 font-medium">Element</th>
                  <th className="px-2 py-3 text-right font-medium">Base HP</th>
                  <th className="px-2 py-3 font-medium">Tagline</th>
                  <th className="py-3 pl-2 pr-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((m) => (
                  <tr
                    key={m.id}
                    className={`group border-b border-white/5 transition hover:bg-white/[0.03] ${
                      m.hidden ? 'opacity-45' : ''
                    }`}
                  >
                    <td className="py-3 pl-4 pr-2">
                      <button
                        onClick={() => setSelectedId(m.id)}
                        className="flex items-center gap-3 text-left focus:outline-none"
                      >
                        <Portrait url={m.imageUrl} type={m.type} />
                        <span className="font-serif text-base font-semibold text-amber-100 group-hover:text-amber-50">
                          {m.name}
                        </span>
                      </button>
                    </td>
                    <td className="px-2 py-3">
                      <TypeBadge type={m.type} />
                    </td>
                    <td className="px-2 py-3 text-right font-semibold tabular-nums text-stone-100">
                      {m.baseHp}
                    </td>
                    <td className="max-w-xs px-2 py-3 text-stone-400">
                      <span className="line-clamp-1 italic">{m.tagline}</span>
                    </td>
                    <td className="py-3 pl-2 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleHidden(m.id)}
                          title={m.hidden ? 'Show' : 'Hide'}
                          className="rounded-md p-1.5 text-stone-500 hover:bg-white/5 hover:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                        >
                          {m.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => setSelectedId(m.id)}
                          title="Open statblock"
                          className="rounded-md p-1.5 text-stone-500 hover:bg-white/5 hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                        >
                          <ChevronRight size={16} />
                        </button>
                        <button
                          onClick={() => deleteMonster(m.id)}
                          title="Delete"
                          className="rounded-md p-1.5 text-stone-500 hover:bg-red-500/10 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {visible.length === 0 && (
            <div className="px-6 py-16 text-center text-stone-500">
              <Skull size={28} className="mx-auto mb-3 opacity-50" />
              Nothing matches. Clear the search or add a new monster.
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-stone-600">
          {visible.length} shown · {monsters.length} total · saved to the server automatically
        </p>
      </div>

      {selected && (
        <DetailDrawer
          monster={selected}
          onClose={() => setSelectedId(null)}
          onChange={updateMonster}
          onDelete={deleteMonster}
        />
      )}
      {adding && <AddDialog onClose={() => setAdding(false)} onAdd={addMonster} />}
    </div>
  )
}
