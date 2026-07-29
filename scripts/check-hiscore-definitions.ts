import { getGameDefinition } from "../src/hiscores/definitions.ts";
import type { GameKey, HiscoreCategoryDefinition } from "../src/types.js";

type UpstreamDefinition = {
  id: string;
  label: string;
};

type CheckResult = {
  game: GameKey;
  differences: string[];
  localCount: number;
};

const WIKI_MODULES: Record<GameKey, string> = {
  osrs: "https://oldschool.runescape.wiki/w/Module:Hiscores?action=raw",
  rs3: "https://runescape.wiki/w/Module:Hiscores?action=raw",
};

const WIKI_ID_ALIASES: Record<GameKey, Map<string, string>> = {
  osrs: new Map([
    ["constitution", "hitpoints"],
    ["runecrafting", "runecraft"],
    ["leagues", "league_points"],
    ["deadman_score", "deadman_points"],
    ["bounty_hunter", "bounty_hunter_hunter"],
    ["legacy_bounty_hunter", "bounty_hunter_legacy_hunter"],
    ["legacy_bounty_hunter_rogue", "bounty_hunter_legacy_rogue"],
    ["last_man_standing", "lms_rank"],
    ["emir_s_arena", "pvp_arena_rank"],
    ["guardians_of_the_rift", "rifts_closed"],
    ["chambers_of_xeric_challenge", "chambers_of_xeric_challenge_mode"],
    ["the_mimic", "mimic"],
    ["the_nightmare", "nightmare"],
    ["theatre_of_blood_hard", "theatre_of_blood_hard_mode"],
    ["tombs_of_amascut_expert", "tombs_of_amascut_expert_mode"],
  ]),
  rs3: new Map([
    ["bounty_hunter_rogue", "b_h_rogues"],
    ["crucible", "the_crucible"],
    ["castle_wars", "castle_wars_games"],
    ["barbarian_assault_attacker", "b_a_attackers"],
    ["barbarian_assault_defender", "b_a_defenders"],
    ["barbarian_assault_collector", "b_a_collectors"],
    ["barbarian_assault_healer", "b_a_healers"],
    ["gielinor_games_athletics", "gg_athletics"],
    ["gielinor_games_resource_race", "gg_resource_race"],
    ["we2_armadyl_contribution", "we2_armadyl_lifetime_contribution"],
    ["we2_bandos_contribution", "we2_bandos_lifetime_contribution"],
    ["cfp_5_games", "cfp_5_game_average"],
    ["af15_rat_kills", "af15_rats_killed_after_the_miniquest"],
    ["leagues", "leagues_points"],
  ]),
};

const results = await Promise.all((["rs3", "osrs"] as const).map(checkGame));
const failures = results.filter(({ differences }) => differences.length > 0);

for (const { differences, game, localCount } of results) {
  if (differences.length === 0) {
    console.log(`${game}: ${localCount} definitions match upstream order.`);
  }
}

if (failures.length > 0) {
  for (const { game, differences } of failures) {
    console.error(`\n${game}: HiScores definitions are stale.`);
    for (const difference of differences.slice(0, 20)) {
      console.error(difference);
    }
    if (differences.length > 20) {
      console.error(`...and ${differences.length - 20} more differences.`);
    }
  }
  process.exitCode = 1;
}

async function checkGame(game: GameKey): Promise<CheckResult> {
  const [localDefinitions, upstreamDefinitions] = await Promise.all([
    localDefinitionsForGame(game),
    wikiDefinitionsForGame(game),
  ]);

  return {
    differences: compareDefinitions(localDefinitions, upstreamDefinitions),
    game,
    localCount: localDefinitions.length,
  };
}

function localDefinitionsForGame(game: GameKey): HiscoreCategoryDefinition[] {
  const definition = getGameDefinition(game);
  if (!definition) {
    throw new Error(`Missing ${game} game definition.`);
  }

  return definition.categories;
}

async function wikiDefinitionsForGame(game: GameKey): Promise<UpstreamDefinition[]> {
  const response = await fetch(WIKI_MODULES[game], {
    headers: {
      Accept: "text/plain",
      "User-Agent": "trmnl-runescape stale definition check",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${WIKI_MODULES[game]}: ${response.status}`);
  }

  return extractLuaStatsOrder(await response.text(), game).map((wikiName) => {
    const wikiId = slugify(wikiName);
    return {
      id: WIKI_ID_ALIASES[game].get(wikiId) ?? wikiId,
      label: wikiName,
    };
  });
}

function compareDefinitions(
  localDefinitions: HiscoreCategoryDefinition[],
  upstreamDefinitions: UpstreamDefinition[],
): string[] {
  const differences: string[] = [];
  const maxLength = Math.max(localDefinitions.length, upstreamDefinitions.length);

  for (let index = 0; index < maxLength; index += 1) {
    const local = localDefinitions[index];
    const upstream = upstreamDefinitions[index];

    if (!local) {
      differences.push(formatDifference(index, "missing locally", upstream));
      continue;
    }

    if (!upstream) {
      differences.push(formatDifference(index, local, "missing upstream"));
      continue;
    }

    if (local.id !== upstream.id) {
      differences.push(formatDifference(index, local, upstream));
    }
  }

  return differences;
}

function formatDifference(
  index: number,
  local: HiscoreCategoryDefinition | string,
  upstream: UpstreamDefinition | string,
): string {
  return [
    `row ${index}:`,
    `local=${formatDefinition(local)}`,
    `upstream=${formatDefinition(upstream)}`,
  ].join(" ");
}

function formatDefinition(
  definition: HiscoreCategoryDefinition | UpstreamDefinition | string,
): string {
  if (typeof definition === "string") {
    return definition;
  }
  return `${definition.label} (${definition.id})`;
}

function extractLuaStatsOrder(source: string, game: GameKey): string[] {
  const match = source.match(new RegExp(`\\n\\t${game} = \\{([\\s\\S]*?)\\n\\t\\}`));
  if (!match) {
    throw new Error(`Could not find ${game} stats_order in wiki module`);
  }

  return [...match[1].matchAll(/'((?:\\'|[^'])+)'/g)].map((entry) =>
    entry[1].replaceAll("\\'", "'"),
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("&", "and")
    .replaceAll(/[^a-z0-9]+/g, "_")
    .replaceAll(/^_+|_+$/g, "");
}
