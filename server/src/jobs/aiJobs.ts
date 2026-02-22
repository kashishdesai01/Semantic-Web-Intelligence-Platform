import { pgPool } from "../dbpg";
import { callJson } from "../services/ai";

export async function buildWeeklyDigest(userId: number) {
  const client = await pgPool.connect();
  try {
    const notes = await client.query(
      `
      SELECT n.id, n.summary, n.key_insights, n.created_at,
             s.title, s.url, s.domain
      FROM notes n
      JOIN sources s ON s.id = n.source_id
      WHERE n.user_id = $1
        AND n.created_at >= now() - interval '7 days'
      ORDER BY n.created_at DESC
      LIMIT 50
      `,
      [userId]
    );

    if (notes.rowCount === 0) {
      return { themes: [], summary: "No notes found for this week." };
    }

    const context = notes.rows
      .map(
        (n: any) =>
          `Note ${n.id} | ${n.title || "Untitled"} | ${n.url}\nSummary: ${
            n.summary
          }\nKey insights: ${(n.key_insights || []).join("; ")}`
      )
      .join("\n\n");

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
${context}
`.trim();

    return await callJson<{
      summary: string;
      themes: { title: string; summary: string; note_ids: number[] }[];
    }>(prompt);
  } finally {
    client.release();
  }
}

export async function buildGraph(userId: number) {
  const client = await pgPool.connect();
  try {
    const notes = await client.query(
      `
      SELECT n.id, n.summary, n.key_insights,
             s.title, s.url
      FROM notes n
      JOIN sources s ON s.id = n.source_id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT 50
      `,
      [userId]
    );

    if (notes.rowCount === 0) {
      return { nodes: [], edges: [] };
    }

    const context = notes.rows
      .map(
        (n: any) =>
          `Note ${n.id} | ${n.title || "Untitled"} | ${n.url}\nSummary: ${
            n.summary
          }\nKey insights: ${(n.key_insights || []).join("; ")}`
      )
      .join("\n\n");

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
${context}
`.trim();

    return await callJson<{
      nodes: { id: string; label: string; type: string }[];
      edges: { source: string; target: string; label: string }[];
    }>(prompt);
  } finally {
    client.release();
  }
}

export async function buildRecommendations(userId: number) {
  const client = await pgPool.connect();
  try {
    const notes = await client.query(
      `
      SELECT n.id, n.summary, n.key_insights,
             s.title, s.url
      FROM notes n
      JOIN sources s ON s.id = n.source_id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT 50
      `,
      [userId]
    );

    if (notes.rowCount === 0) {
      return { recommendations: [] };
    }

    const context = notes.rows
      .map(
        (n: any) =>
          `Note ${n.id} | ${n.title || "Untitled"} | ${n.url}\nSummary: ${
            n.summary
          }\nKey insights: ${(n.key_insights || []).join("; ")}`
      )
      .join("\n\n");

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
${context}
`.trim();

    return await callJson<{
      recommendations: { title: string; reason: string; note_ids: number[] }[];
    }>(prompt);
  } finally {
    client.release();
  }
}

export async function buildContradictions(userId: number) {
  const client = await pgPool.connect();
  try {
    const notes = await client.query(
      `
      SELECT n.id, n.summary, n.key_insights,
             s.title, s.url
      FROM notes n
      JOIN sources s ON s.id = n.source_id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT 50
      `,
      [userId]
    );

    if (notes.rowCount === 0) {
      return { contradictions: [] };
    }

    const context = notes.rows
      .map(
        (n: any) =>
          `Note ${n.id} | ${n.title || "Untitled"} | ${n.url}\nSummary: ${
            n.summary
          }\nKey insights: ${(n.key_insights || []).join("; ")}`
      )
      .join("\n\n");

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
${context}
`.trim();

    return await callJson<{
      contradictions: { claim_a: string; claim_b: string; note_ids: number[] }[];
    }>(prompt);
  } finally {
    client.release();
  }
}
