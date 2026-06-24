export type GameKey = "rs3" | "osrs";

export type ModeKey =
  | "player"
  | "ironman"
  | "hardcore_ironman"
  | "ultimate_ironman"
  | "deadman"
  | "leagues";

export type HiscoreCategoryKind = "skill" | "activity" | "boss";

export type HiscoreCategoryDefinition = {
  id: string;
  label: string;
  kind: HiscoreCategoryKind;
  valueLabel: string;
};

export type HiscoreEntry = {
  id: string;
  label: string;
  kind: HiscoreCategoryKind;
  rank: number;
  valueLabel: string;
  value: number | null;
};

export type HiscoreHeadline = {
  label: string;
  rank: number | null;
  valueLabel: string;
  value: number | null;
};

export type HiscoreSummary = {
  ok: true;
  gameName: string;
  modeName: string;
  subjectName: string;
  headline: HiscoreHeadline;
  entries: HiscoreEntry[];
  generatedAt: string;
};

export type HiscoreGameDefinition = {
  key: GameKey;
  label: string;
  modePaths: Partial<Record<ModeKey, string>>;
  categories: HiscoreCategoryDefinition[];
};

export function sortEntriesByRank(entries: HiscoreEntry[]): HiscoreEntry[] {
  return entries.toSorted((a, b) => a.rank - b.rank);
}
