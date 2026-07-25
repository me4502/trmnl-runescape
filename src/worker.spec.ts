import { beforeEach, describe, expect, it, vi } from "vitest";

import worker from "./worker.js";

describe("worker API caching", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", createHiscoresFetchMock());
  });

  it("marks successful anonymous summary responses as cacheable", async () => {
    const response = await worker.fetch(
      incomingRequest("https://example.com/api/rs3/summary?ignored=true&mode=player&name=Zezima"),
    );

    expect(response.headers.get("cache-control")).toBe("public, max-age=3600, s-maxage=3600");
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      gameName: "RuneScape",
      subjectName: "Zezima",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not cache requests with authorization headers", async () => {
    const response = await worker.fetch(
      incomingRequest("https://example.com/api/rs3/summary?mode=player&name=Zezima", {
        headers: {
          authorization: "Bearer token",
        },
      }),
    );

    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      gameName: "RuneScape",
    });
  });

  it("fetches Leagues summaries", async () => {
    const response = await worker.fetch(
      incomingRequest("https://example.com/api/rs3/summary?mode=leagues&name=Andre%20N"),
    );

    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      gameName: "RuneScape",
      modeName: "Leagues",
      subjectName: "Andre N",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("fetches solo Ironman summaries", async () => {
    const response = await worker.fetch(
      incomingRequest("https://example.com/api/osrs/summary?mode=ironman&name=City%20Morgue"),
    );

    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      gameName: "Old School",
      modeName: "Ironman",
      subjectName: "City Morgue",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("fetches OSRS-only Deadman summaries", async () => {
    const response = await worker.fetch(
      incomingRequest("https://example.com/api/osrs/summary?mode=deadman&name=Aplo"),
    );

    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      gameName: "Old School",
      modeName: "Deadman Mode",
      subjectName: "Aplo",
    });
  });

  it("rejects OSRS-only modes for RuneScape", async () => {
    const response = await worker.fetch(
      incomingRequest("https://example.com/api/rs3/summary?mode=ultimate_ironman&name=Zezima"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      gameName: "RuneScape",
      modeName: "Ultimate Ironman",
      error: "Ultimate Ironman is not supported for RuneScape.",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns renderable error JSON when the player name is missing", async () => {
    const response = await worker.fetch(
      incomingRequest("https://example.com/api/osrs/summary?mode=player&name="),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      gameName: "Old School",
      modeName: "Player",
      error: "Add an Old School player name.",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("includes title bar metadata in upstream error JSON", async () => {
    const response = await worker.fetch(
      incomingRequest("https://example.com/api/rs3/summary?mode=player&name=Unknown%20Player"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      gameName: "RuneScape",
      modeName: "Player",
      subjectName: "Unknown Player",
      error: "That player was not found on the selected HiScores.",
    });
  });
});

function incomingRequest(
  input: string,
  init?: RequestInit,
): Request<unknown, IncomingRequestCfProperties<unknown>> {
  return new Request(input, init) as Request<unknown, IncomingRequestCfProperties<unknown>>;
}

function cacheKeyUrl(request: RequestInfo | URL): string {
  if (typeof request === "string") {
    return request;
  }
  if (request instanceof URL) {
    return request.toString();
  }
  return request.url;
}

function createHiscoresFetchMock() {
  return vi.fn<typeof fetch>(async (input) => {
    const url = cacheKeyUrl(input);
    if (url.startsWith("https://secure.runescape.com/m=hiscore/index_lite.ws")) {
      if (url.includes("player=Unknown+Player")) {
        return new Response("Not found", { status: 404 });
      }

      return new Response(
        [
          "6366,3211,5709998811",
          ...Array.from({ length: 60 }, (_, index) => `${1000 + index},99,13034431`),
        ].join("\n"),
      );
    }

    if (url.startsWith("https://secure.runescape.com/m=hiscore_oldschool_ironman/index_lite.ws")) {
      return new Response(
        [
          "1,2376,4800000000",
          ...Array.from({ length: 90 }, (_, index) => `${100 + index},99,13034431`),
        ].join("\n"),
      );
    }

    if (url.startsWith("https://secure.runescape.com/m=hiscore_oldschool_deadman/index_lite.ws")) {
      return new Response(
        [
          "1,2278,4451346822",
          ...Array.from({ length: 90 }, (_, index) => `${20 + index},99,13034431`),
        ].join("\n"),
      );
    }

    if (url.startsWith("https://secure.runescape.com/m=hiscore_leagues/index_lite.ws")) {
      return new Response(
        [
          "4,3029,1975645803",
          ...Array.from({ length: 60 }, (_, index) => `${100 + index},99,13034431`),
        ].join("\n"),
      );
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });
}
