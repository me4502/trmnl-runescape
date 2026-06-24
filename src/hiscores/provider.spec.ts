import { describe, expect, it, vi } from "vitest";
import { getGameDefinition } from "./definitions.js";
import { buildHiscoreSummary, hiscoresErrorMessage } from "./provider.js";

describe("buildHiscoreSummary", () => {
  it("fetches and normalizes player HiScores", async () => {
    const definition = getGameDefinition("rs3");
    if (!definition) {
      throw new Error("Missing RS3 definition");
    }

    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          [
            "6366,3211,5709998811",
            ...Array.from(
              { length: definition.categories.length - 1 },
              (_, index) => `${1000 + index},99,13034431`,
            ),
          ].join("\n"),
          {
            headers: {
              "content-length": "512",
            },
          },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const summary = await buildHiscoreSummary({
      definition,
      mode: "player",
      name: "Zezima",
      now: new Date("2026-06-21T09:00:00.000Z"),
    });

    expect(summary).toMatchObject({
      ok: true,
      gameName: "RuneScape",
      modeName: "Player",
      subjectName: "Zezima",
      headline: {
        label: "Overall",
        rank: 6366,
        valueLabel: "Total level",
        value: 3211,
      },
      generatedAt: "2026-06-21T09:00:00.000Z",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://secure.runescape.com/m=hiscore/index_lite.ws?player=Zezima"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "text/plain",
        }),
        redirect: "manual",
      }),
    );
  });

  it("fetches Leagues HiScores from the seasonal endpoint", async () => {
    const definition = getGameDefinition("rs3");
    if (!definition) {
      throw new Error("Missing RS3 definition");
    }

    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          [
            "4,3029,1975645803",
            ...Array.from(
              { length: definition.categories.length - 1 },
              (_, index) => `${100 + index},99,13034431`,
            ),
          ].join("\n"),
          {
            headers: {
              "content-length": "512",
            },
          },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const summary = await buildHiscoreSummary({
      definition,
      mode: "leagues",
      name: "Andre N",
      now: new Date("2026-06-23T11:00:00.000Z"),
    });

    expect(summary).toMatchObject({
      ok: true,
      gameName: "RuneScape",
      modeName: "Leagues",
      subjectName: "Andre N",
      headline: {
        label: "Overall",
        rank: 4,
        valueLabel: "Total level",
        value: 3029,
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://secure.runescape.com/m=hiscore_leagues/index_lite.ws?player=Andre+N"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "text/plain",
        }),
        redirect: "manual",
      }),
    );
  });

  it("fetches Ironman HiScores from the Ironman endpoint", async () => {
    const definition = getGameDefinition("osrs");
    if (!definition) {
      throw new Error("Missing OSRS definition");
    }

    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          [
            "1,2376,4800000000",
            ...Array.from(
              { length: definition.categories.length - 1 },
              (_, index) => `${100 + index},99,13034431`,
            ),
          ].join("\n"),
          {
            headers: {
              "content-length": "512",
            },
          },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const summary = await buildHiscoreSummary({
      definition,
      mode: "ironman",
      name: "City Morgue",
      now: new Date("2026-06-23T11:30:00.000Z"),
    });

    expect(summary).toMatchObject({
      ok: true,
      gameName: "Old School",
      modeName: "Ironman",
      subjectName: "City Morgue",
      headline: {
        label: "Overall",
        rank: 1,
        valueLabel: "Total level",
        value: 2376,
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        "https://secure.runescape.com/m=hiscore_oldschool_ironman/index_lite.ws?player=City+Morgue",
      ),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "text/plain",
        }),
        redirect: "manual",
      }),
    );
  });

  it("fetches Hardcore Ironman HiScores from the Hardcore Ironman endpoint", async () => {
    const definition = getGameDefinition("rs3");
    if (!definition) {
      throw new Error("Missing RS3 definition");
    }

    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          [
            "1,3211,5800000000",
            ...Array.from(
              { length: definition.categories.length - 1 },
              (_, index) => `${10 + index},99,13034431`,
            ),
          ].join("\n"),
          {
            headers: {
              "content-length": "512",
            },
          },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const summary = await buildHiscoreSummary({
      definition,
      mode: "hardcore_ironman",
      name: "J oris",
      now: new Date("2026-06-23T11:30:00.000Z"),
    });

    expect(summary).toMatchObject({
      ok: true,
      gameName: "RuneScape",
      modeName: "Hardcore Ironman",
      subjectName: "J oris",
      headline: {
        label: "Overall",
        rank: 1,
        valueLabel: "Total level",
        value: 3211,
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        "https://secure.runescape.com/m=hiscore_hardcore_ironman/index_lite.ws?player=J+oris",
      ),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "text/plain",
        }),
        redirect: "manual",
      }),
    );
  });

  it("fetches OSRS-only Ultimate Ironman and Deadman HiScores", async () => {
    const definition = getGameDefinition("osrs");
    if (!definition) {
      throw new Error("Missing OSRS definition");
    }

    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          [
            "1,2376,4066665126",
            ...Array.from(
              { length: definition.categories.length - 1 },
              (_, index) => `${20 + index},99,13034431`,
            ),
          ].join("\n"),
          {
            headers: {
              "content-length": "512",
            },
          },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const ultimateSummary = await buildHiscoreSummary({
      definition,
      mode: "ultimate_ironman",
      name: "Wooooo91",
      now: new Date("2026-06-23T11:55:00.000Z"),
    });
    const deadmanSummary = await buildHiscoreSummary({
      definition,
      mode: "deadman",
      name: "Aplo",
      now: new Date("2026-06-23T11:55:00.000Z"),
    });

    expect(ultimateSummary).toMatchObject({
      ok: true,
      gameName: "Old School",
      modeName: "Ultimate Ironman",
      subjectName: "Wooooo91",
      headline: {
        label: "Overall",
        rank: 1,
        valueLabel: "Total level",
        value: 2376,
      },
    });
    expect(deadmanSummary).toMatchObject({
      ok: true,
      gameName: "Old School",
      modeName: "Deadman Mode",
      subjectName: "Aplo",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        "https://secure.runescape.com/m=hiscore_oldschool_ultimate/index_lite.ws?player=Wooooo91",
      ),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "text/plain",
        }),
        redirect: "manual",
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://secure.runescape.com/m=hiscore_oldschool_deadman/index_lite.ws?player=Aplo"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "text/plain",
        }),
        redirect: "manual",
      }),
    );
  });

  it("reports missing players", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => new Response("Not found", { status: 404 })),
    );

    const definition = getGameDefinition("osrs");
    if (!definition) {
      throw new Error("Missing OSRS definition");
    }

    let caught: unknown;
    try {
      await buildHiscoreSummary({
        definition,
        mode: "player",
        name: "Unknown Player",
      });
    } catch (error) {
      caught = error;
    }

    expect(hiscoresErrorMessage(caught)).toBe(
      "That player was not found on the selected HiScores.",
    );
  });

  it("reports redirected unavailable modes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => new Response(null, { status: 303 })),
    );

    const definition = getGameDefinition("rs3");
    if (!definition) {
      throw new Error("Missing RS3 definition");
    }

    let caught: unknown;
    try {
      await buildHiscoreSummary({
        definition,
        mode: "player",
        name: "Zezima",
      });
    } catch (error) {
      caught = error;
    }

    expect(hiscoresErrorMessage(caught)).toBe("That HiScores mode is not currently available.");
  });
});
