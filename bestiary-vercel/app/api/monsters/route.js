import { getMonsters, setMonsters } from "../../../lib/store.js";
import { buildLevels } from "../../../lib/seed.js";

export const dynamic = "force-dynamic";

const slug = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function GET() {
  const monsters = await getMonsters();
  return Response.json(monsters);
}

export async function POST(request) {
  const body = await request.json();
  if (!body.name || !body.name.trim()) {
    return Response.json({ error: "Name is required." }, { status: 400 });
  }
  const type = ["fire", "sea", "sky", "forest"].includes(body.type)
    ? body.type
    : "fire";
  const baseHp = Number(body.baseHp) || 0;

  const monster = {
    id: `${slug(body.name)}-${Date.now()}`,
    name: body.name.trim(),
    type,
    baseHp,
    tagline: (body.tagline || "").trim(),
    imageUrl: body.imageUrl || "",
    hidden: false,
    levels: body.levels || buildLevels(baseHp, type),
  };

  const monsters = await getMonsters();
  const next = [monster, ...monsters];
  await setMonsters(next);
  return Response.json(monster, { status: 201 });
}
