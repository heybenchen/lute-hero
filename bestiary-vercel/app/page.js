"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildLevels, hpAtLevel } from "../lib/seed.js";

const TYPES = { fire: "🔥 Fire", sea: "🌊 Sea", sky: "💨 Sky", forest: "🌲 Forest" };
const TYPE_KEYS = Object.keys(TYPES);
const ICON = { fire: "🔥", sea: "🌊", sky: "💨", forest: "🌲" };

const api = {
  list: () => fetch("/api/monsters").then((r) => r.json()),
  create: (m) =>
    fetch("/api/monsters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(m),
    }).then((r) => r.json()),
  update: (id, m) =>
    fetch(`/api/monsters/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(m),
    }).then((r) => r.json()),
  remove: (id) => fetch(`/api/monsters/${id}`, { method: "DELETE" }),
};

function fileToDataUrl(file, maxDim = 512) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Page() {
  const [monsters, setMonsters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [showHidden, setShowHidden] = useState(true);
  const [selId, setSelId] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.list().then((data) => {
      setMonsters(data);
      setLoading(false);
    });
  }, []);

  const patch = async (id, updates) => {
    setMonsters((ms) => ms.map((m) => (m.id === id ? { ...m, ...updates } : m)));
    await api.update(id, updates);
  };
  const remove = async (id) => {
    setMonsters((ms) => ms.filter((m) => m.id !== id));
    setSelId(null);
    await api.remove(id);
  };
  const add = async (m) => {
    const created = await api.create(m);
    setMonsters((ms) => [created, ...ms]);
  };

  const counts = useMemo(() => {
    const c = { all: monsters.length, fire: 0, sea: 0, sky: 0, forest: 0 };
    monsters.forEach((m) => (c[m.type] += 1));
    return c;
  }, [monsters]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return monsters.filter((m) => {
      if (!showHidden && m.hidden) return false;
      if (filter !== "all" && m.type !== filter) return false;
      if (q && !`${m.name} ${m.tagline}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [monsters, query, filter, showHidden]);

  const selected = monsters.find((m) => m.id === selId) || null;

  if (loading) {
    return (
      <div className="wrap" style={{ color: "var(--faint)" }}>
        Summoning the bestiary…
      </div>
    );
  }

  return (
    <div className="wrap">
      <header className="mast">
        <div className="eyebrow">Battle of the Bands · Monster Manual</div>
        <h1 className="title serif">The Bestiary</h1>
        <p className="lede">
          Every pun-named horror in the setlist. Search, filter, hide the ones
          you're saving, and open any row for its full statblock.
        </p>
      </header>

      <div className="controls">
        <input
          className="search"
          placeholder="Search names and taglines…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn-ghost" onClick={() => setShowHidden((v) => !v)}>
          {showHidden ? "👁 Showing hidden" : "🚫 Hiding hidden"}
        </button>
        <button className="btn" onClick={() => setAdding(true)}>
          + Add monster
        </button>
      </div>

      <div className="chips">
        {["all", ...TYPE_KEYS].map((k) => (
          <button
            key={k}
            className={`chip ${filter === k ? "active" : ""}`}
            onClick={() => setFilter(k)}
          >
            {k === "all" ? "All" : TYPES[k]}
            <span className="n">{counts[k]}</span>
          </button>
        ))}
      </div>

      <div className="tablewrap">
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Monster</th>
                <th>Element</th>
                <th style={{ textAlign: "right" }}>Base HP</th>
                <th>Tagline</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((m) => (
                <tr key={m.id} className={m.hidden ? "hidden-row" : ""}>
                  <td>
                    <button className="name-cell" onClick={() => setSelId(m.id)}>
                      {m.imageUrl ? (
                        <img className="thumb" src={m.imageUrl} alt="" />
                      ) : (
                        <span className="thumb ph">{ICON[m.type]}</span>
                      )}
                      <span className="name">{m.name}</span>
                    </button>
                  </td>
                  <td>
                    <span className={`badge ${m.type}`}>
                      {ICON[m.type]} {m.type[0].toUpperCase() + m.type.slice(1)}
                    </span>
                  </td>
                  <td className="hp">{m.baseHp}</td>
                  <td>
                    <div className="tagline">{m.tagline}</div>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        className="icon-btn"
                        title={m.hidden ? "Show" : "Hide"}
                        onClick={() => patch(m.id, { hidden: !m.hidden })}
                      >
                        {m.hidden ? "🚫" : "👁"}
                      </button>
                      <button
                        className="icon-btn"
                        title="Open"
                        onClick={() => setSelId(m.id)}
                      >
                        ›
                      </button>
                      <button
                        className="icon-btn danger"
                        title="Delete"
                        onClick={() => remove(m.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visible.length === 0 && (
          <div className="empty">Nothing matches. Clear the search or add one.</div>
        )}
      </div>

      <p className="foot">
        {visible.length} shown · {monsters.length} total · saved to the server
      </p>

      {selected && (
        <Drawer
          monster={selected}
          onClose={() => setSelId(null)}
          onPatch={(u) => patch(selected.id, u)}
          onDelete={() => remove(selected.id)}
        />
      )}
      {adding && <AddModal onClose={() => setAdding(false)} onAdd={add} />}
    </div>
  );
}

function Drawer({ monster, onClose, onPatch, onDelete }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const patchLevel = (i, fields) =>
    onPatch({
      levels: monster.levels.map((l, j) => (j === i ? { ...l, ...fields } : l)),
    });
  const addLevel = () => {
    const n = monster.levels.length + 1;
    onPatch({
      levels: [...monster.levels, { level: n, hp: hpAtLevel(monster.baseHp, n), effect: "" }],
    });
  };
  const removeLevel = (i) =>
    onPatch({ levels: monster.levels.filter((_, j) => j !== i) });

  const upload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      onPatch({ imageUrl: await fileToDataUrl(f) });
    } catch {}
    setBusy(false);
  };

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="drawer">
        <div className="head">
          <span className="eb">💀 Statblock</span>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="body">
          <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
            {monster.imageUrl ? (
              <img className="thumb" style={{ width: 88, height: 88 }} src={monster.imageUrl} alt="" />
            ) : (
              <span className="thumb ph" style={{ width: 88, height: 88, fontSize: 34 }}>
                {ICON[monster.type]}
              </span>
            )}
            <div style={{ flex: 1 }}>
              <input
                className="full serif"
                style={{ fontSize: 22, fontWeight: 700, color: "#fde68a", background: "none", border: "none", padding: 0 }}
                value={monster.name}
                onChange={(e) => onPatch({ name: e.target.value })}
              />
              <input
                className="full"
                style={{ fontStyle: "italic", color: "var(--muted)", background: "none", border: "none", padding: "4px 0" }}
                value={monster.tagline}
                placeholder="Tagline…"
                onChange={(e) => onPatch({ tagline: e.target.value })}
              />
              <div className="type-picker">
                {TYPE_KEYS.map((k) => (
                  <button
                    key={k}
                    className={`type-opt ${k} ${monster.type === k ? "on" : ""}`}
                    onClick={() => onPatch({ type: k })}
                  >
                    {ICON[k]} {k[0].toUpperCase() + k.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="row mt" style={{ flexWrap: "wrap" }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={upload} />
            <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
              {busy ? "Processing…" : "⬆ Upload image"}
            </button>
            {monster.imageUrl && (
              <button className="btn-ghost" onClick={() => onPatch({ imageUrl: "" })}>Remove</button>
            )}
            <input
              className="full"
              style={{ flex: 1, minWidth: 160 }}
              placeholder="…or paste an image URL"
              value={monster.imageUrl.startsWith("data:") ? "" : monster.imageUrl}
              onChange={(e) => onPatch({ imageUrl: e.target.value })}
            />
          </div>

          <div className="row mt">
            <label className="field-label" style={{ margin: 0 }}>Base HP</label>
            <input
              type="number"
              style={{ width: 100 }}
              value={monster.baseHp}
              onChange={(e) => onPatch({ baseHp: parseInt(e.target.value || "0", 10) })}
            />
            <button
              className="btn-ghost"
              style={{ marginLeft: "auto" }}
              onClick={() => onPatch({ levels: buildLevels(monster.baseHp, monster.type) })}
            >
              Reset levels
            </button>
          </div>

          <div className="mt-lg">
            <div className="row spread">
              <h3 className="serif" style={{ color: "#fde68a", margin: 0 }}>By level</h3>
              <button className="btn-ghost" onClick={addLevel}>+ Add level</button>
            </div>
            <div className="mt">
              {monster.levels.map((lvl, i) => (
                <div className="level-card" key={i}>
                  <div className="level-top">
                    <span className="level-badge">{lvl.level}</span>
                    <label className="field-label" style={{ margin: 0 }}>HP</label>
                    <input
                      type="number"
                      style={{ width: 90 }}
                      value={lvl.hp}
                      onChange={(e) => patchLevel(i, { hp: parseInt(e.target.value || "0", 10) })}
                    />
                    <button
                      className="icon-btn danger"
                      style={{ marginLeft: "auto" }}
                      onClick={() => removeLevel(i)}
                    >
                      🗑
                    </button>
                  </div>
                  <textarea
                    className="full"
                    style={{ marginTop: 8, resize: "vertical" }}
                    rows={2}
                    placeholder="Additional effect at this level…"
                    value={lvl.effect}
                    onChange={(e) => patchLevel(i, { effect: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-lg" style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
            <button className="del-btn" onClick={onDelete}>🗑 Delete this monster</button>
          </div>
        </div>
      </div>
    </>
  );
}

function AddModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("fire");
  const [baseHp, setBaseHp] = useState(50);
  const [tagline, setTagline] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), type, baseHp: Number(baseHp) || 0, tagline: tagline.trim() });
    onClose();
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>New monster</h2>
        <div className="stack">
          <div>
            <label className="field-label">Name</label>
            <input className="full" autoFocus value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="e.g. Bruce Springsteam" />
          </div>
          <div>
            <label className="field-label">Element</label>
            <div className="type-picker">
              {TYPE_KEYS.map((k) => (
                <button key={k} className={`type-opt ${k} ${type === k ? "on" : ""}`} onClick={() => setType(k)}>
                  {ICON[k]} {k[0].toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="field-label">Base HP</label>
            <input type="number" style={{ width: 120 }} value={baseHp} onChange={(e) => setBaseHp(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Tagline</label>
            <input className="full" value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="One-liner…" />
          </div>
        </div>
        <div className="right">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={submit}>Add to bestiary</button>
        </div>
      </div>
    </div>
  );
}
