import { describe, expect, it } from "vitest";
import { getGameDefinition } from "./definitions.js";
import { parsePlayerHiscores } from "./parser.js";

describe("parsePlayerHiscores", () => {
  it("parses RS3 player HiScores as rank-first summaries", () => {
    const definition = getGameDefinition("rs3");
    if (!definition) {
      throw new Error("Missing RS3 definition");
    }

    const text = [
      "6366,3211,5709998811",
      "349,120,200000000",
      "692,99,200000000",
      "2201,99,200000000",
      ...Array.from(
        { length: definition.categories.length - 4 },
        (_, index) => `${10000 + index},99,13034431`,
      ),
    ].join("\n");

    const summary = parsePlayerHiscores(text, definition);

    expect(summary.headline).toEqual({
      label: "Overall",
      rank: 6366,
      valueLabel: "Total level",
      value: 3211,
    });
    expect(summary.entries.slice(0, 3)).toEqual([
      {
        id: "attack",
        label: "Attack",
        kind: "skill",
        rank: 349,
        valueLabel: "Level",
        value: 120,
      },
      {
        id: "defence",
        label: "Defence",
        kind: "skill",
        rank: 692,
        valueLabel: "Level",
        value: 99,
      },
      {
        id: "strength",
        label: "Strength",
        kind: "skill",
        rank: 2201,
        valueLabel: "Level",
        value: 99,
      },
    ]);
  });

  it("parses non-skill categories with category-specific value labels", () => {
    const definition = getGameDefinition("rs3");
    if (!definition) {
      throw new Error("Missing RS3 definition");
    }

    const text = [
      "6366,3211,5709998811",
      ...Array.from({ length: 29 }, (_, index) => `${10000 + index},99,13034431`),
      "133,26444969",
    ].join("\n");

    const summary = parsePlayerHiscores(text, definition);

    expect(summary.entries[0]).toEqual({
      id: "bounty_hunter",
      label: "Bounty Hunter",
      kind: "activity",
      rank: 133,
      valueLabel: "Score",
      value: 26444969,
    });
  });

  it("omits unranked category rows", () => {
    const definition = getGameDefinition("osrs");
    if (!definition) {
      throw new Error("Missing OSRS definition");
    }

    const text = [
      "1590013,1466,27957906",
      "-1,1,0",
      "1434197,76,1342072",
      ...Array.from(
        { length: definition.categories.length - 3 },
        (_, index) => `${2000000 + index},50,101333`,
      ),
    ].join("\n");

    const summary = parsePlayerHiscores(text, definition);

    expect(summary.entries.some((entry) => entry.label === "Attack")).toBe(false);
    expect(summary.entries[0]?.label).toBe("Defence");
  });

  it("keeps unranked Overall rows so total level can still be displayed", () => {
    const definition = getGameDefinition("osrs");
    if (!definition) {
      throw new Error("Missing OSRS definition");
    }

    const text = [
      "-1,449,184208",
      "-1,36,27340",
      "1434197,76,1342072",
      ...Array.from(
        { length: definition.categories.length - 3 },
        (_, index) => `${2000000 + index},50,101333`,
      ),
    ].join("\n");

    const summary = parsePlayerHiscores(text, definition);

    expect(summary.headline).toEqual({
      label: "Overall",
      rank: null,
      valueLabel: "Total level",
      value: 449,
    });
    expect(summary.entries[0]?.label).toBe("Defence");
  });

  it("keeps the current OSRS category order aligned with newer activities and bosses", () => {
    const definition = getGameDefinition("osrs");
    if (!definition) {
      throw new Error("Missing OSRS definition");
    }

    const text = definition.categories
      .map((category) => {
        if (category.label === "Overall") {
          return "1593799,1466,27957906";
        }
        if (category.label === "Grid Points") {
          return "99,123";
        }
        if (category.label === "Wintertodt") {
          return "42,702";
        }
        return "-1,0";
      })
      .join("\n");

    const summary = parsePlayerHiscores(text, definition);

    expect(summary.entries).toEqual([
      {
        id: "wintertodt",
        label: "Wintertodt",
        kind: "boss",
        rank: 42,
        valueLabel: "KC",
        value: 702,
      },
      {
        id: "grid_points",
        label: "Grid Points",
        kind: "activity",
        rank: 99,
        valueLabel: "Points",
        value: 123,
      },
    ]);
  });
});
