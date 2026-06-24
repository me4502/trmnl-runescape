import type {
  GameKey,
  HiscoreCategoryDefinition,
  HiscoreCategoryKind,
  HiscoreGameDefinition,
  ModeKey,
} from "../types.js";

const RS3_SKILL_NAMES = [
  "Overall",
  "Attack",
  "Defence",
  "Strength",
  "Constitution",
  "Ranged",
  "Prayer",
  "Magic",
  "Cooking",
  "Woodcutting",
  "Fletching",
  "Fishing",
  "Firemaking",
  "Crafting",
  "Smithing",
  "Mining",
  "Herblore",
  "Agility",
  "Thieving",
  "Slayer",
  "Farming",
  "Runecrafting",
  "Hunter",
  "Construction",
  "Summoning",
  "Dungeoneering",
  "Divination",
  "Invention",
  "Archaeology",
  "Necromancy",
];

const RS3_ACTIVITY_NAMES = [
  "Bounty Hunter",
  "B.H. Rogues",
  "Dominion Tower",
  "The Crucible",
  "Castle Wars games",
  "B.A. Attackers",
  "B.A. Defenders",
  "B.A. Collectors",
  "B.A. Healers",
  "Duel Tournament",
  "Mobilising Armies",
  "Conquest",
  "Fist of Guthix",
  "GG: Athletics",
  "GG: Resource Race",
  "WE2: Armadyl Lifetime Contribution",
  "WE2: Bandos Lifetime Contribution",
  "WE2: Armadyl PvP kills",
  "WE2: Bandos PvP kills",
  "Heist Guard Level",
  "Heist Robber Level",
  "CFP: 5 game average",
  "AF15: Cow Tipping",
  "AF15: Rats killed after the miniquest",
  "RuneScore",
  "Clue Scrolls Easy",
  "Clue Scrolls Medium",
  "Clue Scrolls Hard",
  "Clue Scrolls Elite",
  "Clue Scrolls Master",
  "Leagues Points",
];

const OSRS_SKILL_NAMES = [
  "Overall",
  "Attack",
  "Defence",
  "Strength",
  "Hitpoints",
  "Ranged",
  "Prayer",
  "Magic",
  "Cooking",
  "Woodcutting",
  "Fletching",
  "Fishing",
  "Firemaking",
  "Crafting",
  "Smithing",
  "Mining",
  "Herblore",
  "Agility",
  "Thieving",
  "Slayer",
  "Farming",
  "Runecraft",
  "Hunter",
  "Construction",
];

const OSRS_ACTIVITY_NAMES = [
  "League Points",
  "Deadman Points",
  "Bounty Hunter - Hunter",
  "Bounty Hunter - Rogue",
  "Bounty Hunter - Legacy - Hunter",
  "Bounty Hunter - Legacy - Rogue",
  "Clue Scrolls (all)",
  "Clue Scrolls (beginner)",
  "Clue Scrolls (easy)",
  "Clue Scrolls (medium)",
  "Clue Scrolls (hard)",
  "Clue Scrolls (elite)",
  "Clue Scrolls (master)",
  "LMS - Rank",
  "PvP Arena - Rank",
  "Soul Wars Zeal",
  "Rifts closed",
  "Colosseum Glory",
];

const OSRS_BOSS_NAMES = [
  "Abyssal Sire",
  "Alchemical Hydra",
  "Amoxliatl",
  "Araxxor",
  "Artio",
  "Barrows Chests",
  "Bryophyta",
  "Callisto",
  "Calvar'ion",
  "Cerberus",
  "Chambers of Xeric",
  "Chambers of Xeric: Challenge Mode",
  "Chaos Elemental",
  "Chaos Fanatic",
  "Commander Zilyana",
  "Corporeal Beast",
  "Crazy Archaeologist",
  "Dagannoth Prime",
  "Dagannoth Rex",
  "Dagannoth Supreme",
  "Deranged Archaeologist",
  "Duke Sucellus",
  "General Graardor",
  "Giant Mole",
  "Grotesque Guardians",
  "Hespori",
  "Kalphite Queen",
  "King Black Dragon",
  "Kraken",
  "Kree'Arra",
  "K'ril Tsutsaroth",
  "Lunar Chests",
  "Mimic",
  "Nex",
  "Nightmare",
  "Phosani's Nightmare",
  "Obor",
  "Phantom Muspah",
  "Sarachnis",
  "Scorpia",
  "Scurrius",
  "Skotizo",
  "Sol Heredit",
  "Spindel",
  "Tempoross",
  "The Gauntlet",
  "The Corrupted Gauntlet",
  "The Hueycoatl",
  "The Leviathan",
  "The Royal Titans",
  "The Whisperer",
  "Theatre of Blood",
  "Theatre of Blood: Hard Mode",
  "Thermonuclear Smoke Devil",
  "Tombs of Amascut",
  "Tombs of Amascut: Expert Mode",
  "TzKal-Zuk",
  "TzTok-Jad",
  "Vardorvis",
  "Venenatis",
  "Vet'ion",
  "Vorkath",
  "Wintertodt",
  "Yama",
  "Zalcano",
  "Zulrah",
];

const GAME_DEFINITIONS = new Map<GameKey, HiscoreGameDefinition>([
  [
    "rs3",
    {
      key: "rs3",
      label: "RuneScape",
      modePaths: {
        hardcore_ironman: "/m=hiscore_hardcore_ironman/index_lite.ws",
        ironman: "/m=hiscore_ironman/index_lite.ws",
        leagues: "/m=hiscore_leagues/index_lite.ws",
        player: "/m=hiscore/index_lite.ws",
      },
      categories: [
        ...skillCategories(RS3_SKILL_NAMES),
        ...activityCategories(RS3_ACTIVITY_NAMES, rs3ActivityValueLabel),
      ],
    },
  ],
  [
    "osrs",
    {
      key: "osrs",
      label: "Old School",
      modePaths: {
        deadman: "/m=hiscore_oldschool_deadman/index_lite.ws",
        hardcore_ironman: "/m=hiscore_oldschool_hardcore_ironman/index_lite.ws",
        ironman: "/m=hiscore_oldschool_ironman/index_lite.ws",
        leagues: "/m=hiscore_oldschool_seasonal/index_lite.ws",
        player: "/m=hiscore_oldschool/index_lite.ws",
        ultimate_ironman: "/m=hiscore_oldschool_ultimate/index_lite.ws",
      },
      categories: [
        ...skillCategories(OSRS_SKILL_NAMES),
        ...activityCategories(OSRS_ACTIVITY_NAMES, osrsActivityValueLabel),
        ...categories(OSRS_BOSS_NAMES, "boss", "KC"),
      ],
    },
  ],
]);

export function getGameDefinition(gameKey: string): HiscoreGameDefinition | null {
  return GAME_DEFINITIONS.get(gameKey as GameKey) ?? null;
}

export function getModeLabel(mode: ModeKey): string {
  return {
    deadman: "Deadman Mode",
    hardcore_ironman: "Hardcore Ironman",
    ironman: "Ironman",
    leagues: "Leagues",
    player: "Player",
    ultimate_ironman: "Ultimate Ironman",
  }[mode];
}

export function isSupportedMode(mode: string): mode is ModeKey {
  return (
    mode === "player" ||
    mode === "ironman" ||
    mode === "hardcore_ironman" ||
    mode === "ultimate_ironman" ||
    mode === "deadman" ||
    mode === "leagues"
  );
}

export function isSupportedGameMode(definition: HiscoreGameDefinition, mode: ModeKey): boolean {
  return definition.modePaths[mode] !== undefined;
}

function skillCategories(names: string[]): HiscoreCategoryDefinition[] {
  return names.map((name, index) => ({
    id: slugify(name),
    label: name,
    kind: "skill",
    valueLabel: index === 0 ? "Total level" : "Level",
  }));
}

function activityCategories(
  names: string[],
  valueLabelForName: (name: string) => string,
): HiscoreCategoryDefinition[] {
  return names.map((name) => ({
    id: slugify(name),
    label: name,
    kind: "activity",
    valueLabel: valueLabelForName(name),
  }));
}

function categories(
  names: string[],
  kind: HiscoreCategoryKind,
  valueLabel: string,
): HiscoreCategoryDefinition[] {
  return names.map((name) => ({
    id: slugify(name),
    label: name,
    kind,
    valueLabel,
  }));
}

function rs3ActivityValueLabel(name: string): string {
  if (name.includes("Clue Scrolls")) {
    return "Completed";
  }
  if (name === "Leagues Points") {
    return "Points";
  }
  if (name.includes("kills") || name.includes("Rats killed")) {
    return "Kills";
  }
  if (name.includes("Level")) {
    return "Level";
  }
  if (name.includes("games")) {
    return "Games";
  }

  return "Score";
}

function osrsActivityValueLabel(name: string): string {
  if (name.includes("Clue Scrolls")) {
    return "Completed";
  }
  if (name.includes("Points")) {
    return "Points";
  }
  if (name.includes("Rank")) {
    return "Score";
  }
  if (name === "Soul Wars Zeal") {
    return "Zeal";
  }
  if (name === "Rifts closed") {
    return "Closed";
  }

  return "Score";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("&", "and")
    .replaceAll(/[^a-z0-9]+/g, "_")
    .replaceAll(/^_+|_+$/g, "");
}
