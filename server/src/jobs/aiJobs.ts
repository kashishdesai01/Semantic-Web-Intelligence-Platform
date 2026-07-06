import { pgPool } from "../dbpg";
import { callJson } from "../services/ai";

/* ---------- shared note-loading helper ---------- */

type NoteRow = {
  id: number;
  summary: string;
  key_insights: string[] | null;
  title: string | null;
  url: string;
};

async function loadNotes(
  userId: number,
  opts?: { daysBack?: number }
): Promise<NoteRow[]> {
  const client = await pgPool.connect();
  try {
    // Pass daysBack as a bound parameter (never interpolated) and coerce it to
    // a safe positive integer. make_interval keeps it fully parameterized.
    const daysBack =
      opts?.daysBack && Number.isFinite(opts.daysBack)
        ? Math.max(0, Math.floor(opts.daysBack))
        : null;
    const dateFilter = daysBack
      ? "AND n.created_at >= now() - make_interval(days => $2)"
      : "";
    const params: any[] = daysBack ? [userId, daysBack] : [userId];
    const result = await client.query(
      `
      SELECT n.id, n.summary, n.key_insights,
             s.title, s.url
      FROM notes n
      JOIN sources s ON s.id = n.source_id
      WHERE n.user_id = $1
        ${dateFilter}
      ORDER BY n.created_at DESC
      LIMIT 50
      `,
      params
    );
    return result.rows;
  } finally {
    client.release();
  }
}

function buildContext(notes: NoteRow[]): string {
  return notes
    .map(
      (n) =>
        `Note ${n.id} | ${n.title || "Untitled"} | ${n.url}\nSummary: ${
          n.summary
        }\nKey insights: ${(n.key_insights || []).join("; ")}`
    )
    .join("\n\n");
}

/* ---------- feature-specific prompt builders ---------- */

export async function buildWeeklyDigest(userId: number) {
  const notes = await loadNotes(userId, { daysBack: 7 });

  if (notes.length === 0) {
    return { themes: [], summary: "No notes found for this week." };
  }

  const prompt = `
You are summarizing a user's week of reading into themes.
Return STRICT JSON with this shape:
{
  "summary": string,
  "themes": {
    "title": string,
    "summary": string,
    "note_ids": number[]
  }[]
}
Rules:
- 3 to 6 themes.
- Each theme must reference relevant note_ids.

Notes:
${buildContext(notes)}
`.trim();

  return await callJson<{
    summary: string;
    themes: { title: string; summary: string; note_ids: number[] }[];
  }>(prompt);
}

export async function buildGraph(userId: number) {
  const notes = await loadNotes(userId);

  if (notes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const prompt = `
You are building a knowledge graph from reading notes.
Return STRICT JSON with this shape:
{
  "nodes": { "id": string, "label": string, "type": "person"|"org"|"topic"|"place" }[],
  "edges": { "source": string, "target": string, "label": string }[]
}
Rules:
- Max 100 nodes.
- Use consistent IDs for the same entity.
- Edges should represent meaningful relationships.

Notes:
${buildContext(notes)}
`.trim();

  return await callJson<{
    nodes: { id: string; label: string; type: string }[];
    edges: { source: string; target: string; label: string }[];
  }>(prompt);
}

export async function buildRecommendations(userId: number) {
  const notes = await loadNotes(userId);

  if (notes.length === 0) {
    return { recommendations: [] };
  }

  const prompt = `
You recommend what the user should read or revisit next based only on their notes.
Return STRICT JSON with this shape:
{
  "recommendations": {
    "title": string,
    "reason": string,
    "note_ids": number[]
  }[]
}
Rules:
- 5 to 7 recommendations.
- Use note_ids to justify each recommendation.

Notes:
${buildContext(notes)}
`.trim();

  return await callJson<{
    recommendations: { title: string; reason: string; note_ids: number[] }[];
  }>(prompt);
}

export async function buildContradictions(userId: number) {
  const notes = await loadNotes(userId);

  if (notes.length === 0) {
    return { contradictions: [] };
  }

  const prompt = `
You identify conflicting or contradictory claims across notes.
Return STRICT JSON with this shape:
{
  "contradictions": {
    "claim_a": string,
    "claim_b": string,
    "note_ids": number[]
  }[]
}
Rules:
- Only list real contradictions.
- If none, return an empty list.

Notes:
${buildContext(notes)}
`.trim();

  return await callJson<{
    contradictions: { claim_a: string; claim_b: string; note_ids: number[] }[];
  }>(prompt);
}
