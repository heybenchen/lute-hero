import { getMonsters, setMonsters } from "../../../../lib/store.js";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  const updates = await request.json();
  const monsters = await getMonsters();
  const idx = monsters.findIndex((m) => m.id === params.id);
  if (idx === -1) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
  const merged = { ...monsters[idx], ...updates, id: params.id };
  const next = monsters.map((m, i) => (i === idx ? merged : m));
  await setMonsters(next);
  return Response.json(merged);
}

export async function DELETE(_request, { params }) {
  const monsters = await getMonsters();
  const next = monsters.filter((m) => m.id !== params.id);
  await setMonsters(next);
  return Response.json({ ok: true });
}
