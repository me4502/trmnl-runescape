import { sortEntriesByRank } from "../types.js";
import type {
  HiscoreCategoryDefinition,
  HiscoreEntry,
  HiscoreGameDefinition,
  HiscoreHeadline,
} from "../types.js";

export class HiscoresParseError extends Error {}

export type ParsedHiscores = {
  headline: HiscoreHeadline;
  entries: HiscoreEntry[];
};

type HiscoreRow = {
  rank: number;
  value: number | null;
};

export function parsePlayerHiscores(
  text: string,
  definition: HiscoreGameDefinition,
): ParsedHiscores {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map(parseHiscoreRow);

  if (rows.length === 0) {
    throw new HiscoresParseError(`${definition.label} returned an incomplete HiScores response.`);
  }

  const overallCategory = definition.categories[0];
  const overall = rows[0];
  if (!overallCategory || !overall) {
    throw new HiscoresParseError(`${definition.label} did not return Overall HiScores.`);
  }

  const entries = sortEntriesByRank(
    definition.categories
      .slice(1)
      .map((category, index) => toEntry(category, rows[index + 1]))
      .filter((entry): entry is HiscoreEntry => entry !== null),
  );

  return {
    headline: {
      label: "Overall",
      rank: rankedValue(overall.rank),
      valueLabel: overallCategory.valueLabel,
      value: overall.value,
    },
    entries,
  };
}

function rankedValue(rank: number): number | null {
  return rank > 0 ? rank : null;
}

function parseHiscoreRow(line: string): HiscoreRow {
  const [rankValue, value] = line.split(",");
  const rank = parseInteger(rankValue);
  const parsedValue = parseInteger(value);

  if (rank === null || parsedValue === null) {
    throw new HiscoresParseError("HiScores response contained a malformed row.");
  }

  return {
    rank,
    value: parsedValue,
  };
}

function toEntry(
  category: HiscoreCategoryDefinition,
  row: HiscoreRow | undefined,
): HiscoreEntry | null {
  if (!row || row.rank <= 0) {
    return null;
  }

  return {
    id: category.id,
    label: category.label,
    kind: category.kind,
    rank: row.rank,
    valueLabel: category.valueLabel,
    value: row.value,
  };
}

function parseInteger(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    return null;
  }

  return parsed;
}
