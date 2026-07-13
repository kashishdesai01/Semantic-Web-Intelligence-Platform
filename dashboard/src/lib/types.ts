// Shared API types for the dashboard

export type Note = {
  id: number;
  summary: string;
  key_insights: string[];
  highlights?: string[];
  created_at: string;
  url: string;
  title: string | null;
  domain: string | null;
  liked?: boolean;
};

export type Collection = {
  id: number;
  name: string;
  created_at: string;
};

export type Citation = {
  note_id: number;
  title: string;
  url: string;
  highlights: string[];
};

export type QaItem = {
  id: number;
  question: string;
  answer: string;
  answer_with_citations: string | null;
  citations: Citation[];
  created_at: string;
};

export type Totals = {
  total_notes: number;
  total_sources: number;
};

export type DigestNote = {
  id: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  relevance?: number;
};

export type DigestSectionData = {
  cluster: string;
  noteCount: number;
  synthesis: string;
  notes: DigestNote[];
};

export type DigestFull = {
  weekRange: string;
  generatedAt: string;
  overview: string;
  sections: DigestSectionData[];
};

export type PastDigest = {
  id: string;
  weekRange: string;
  summary: string;
  noteCount: number;
};

export type WeekStats = {
  notesThisWeek: number;
  topicsCount: number;
  sourceCount: number;
};

export type ClusterPreview = {
  name: string;
  count: number;
};
