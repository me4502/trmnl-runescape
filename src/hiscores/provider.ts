import type { HiscoreGameDefinition, HiscoreSummary, ModeKey } from "../types.js";
import { getModeLabel } from "./definitions.js";
import { HiscoresParseError, parsePlayerHiscores } from "./parser.js";

const API_ORIGIN = "https://secure.runescape.com";
const MAX_HISCORES_BYTES = 64 * 1024;

class HiscoresApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function buildHiscoreSummary(input: {
  definition: HiscoreGameDefinition;
  mode: ModeKey;
  name: string;
  now?: Date;
}): Promise<HiscoreSummary> {
  const now = input.now ?? new Date();
  const subjectName = input.name.trim();
  if (subjectName.length === 0) {
    throw new HiscoresApiError("Missing player name.", 400);
  }

  const text = await fetchPlayerHiscores(input.definition, input.mode, subjectName);
  const parsed = parsePlayerHiscores(text, input.definition);

  return {
    ok: true,
    gameName: input.definition.label,
    modeName: getModeLabel(input.mode),
    subjectName,
    headline: parsed.headline,
    entries: parsed.entries,
    generatedAt: now.toISOString(),
  };
}

export function hiscoresErrorMessage(error: unknown): string | null {
  if (error instanceof HiscoresParseError) {
    return error.message;
  }

  if (!(error instanceof HiscoresApiError)) {
    return null;
  }

  if (error.status === 400) {
    return error.message;
  }
  if (error.status === 404) {
    return "That player was not found on the selected HiScores.";
  }
  if (error.status === 429) {
    return "RuneScape HiScores rate limit reached. Try again later.";
  }
  if (error.status === 503) {
    return "That HiScores mode is not currently available.";
  }
  if (error.status === 502) {
    return "RuneScape HiScores returned an invalid response.";
  }

  return "Unknown error. Are the RuneScape HiScores down?";
}

async function fetchPlayerHiscores(
  definition: HiscoreGameDefinition,
  mode: ModeKey,
  playerName: string,
): Promise<string> {
  const modePath = definition.modePaths[mode];
  if (!modePath) {
    throw new HiscoresApiError(
      `${getModeLabel(mode)} is not supported for ${definition.label}.`,
      400,
    );
  }

  const url = new URL(`${API_ORIGIN}${modePath}`);
  url.searchParams.set("player", playerName);

  const response = await fetch(url, {
    headers: {
      Accept: "text/plain",
    },
    redirect: "manual",
  });

  if (response.status >= 300 && response.status < 400) {
    throw new HiscoresApiError("RuneScape HiScores redirected unexpectedly.", 503);
  }

  if (!response.ok) {
    throw new HiscoresApiError(
      `RuneScape HiScores request failed: ${response.status}`,
      response.status,
    );
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_HISCORES_BYTES) {
    throw new HiscoresApiError("RuneScape HiScores response was too large.", 502);
  }

  const text = await response.text();
  if (text.length > MAX_HISCORES_BYTES) {
    throw new HiscoresApiError("RuneScape HiScores response was too large.", 502);
  }

  return text;
}
