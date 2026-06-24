import { beforeEach, describe, expect, it, vi } from "vitest";

import worker from "./worker.js";

let cache: Cache;

describe("worker API caching", () => {
  beforeEach(() => {
    cache = createCacheStub();
    vi.stubGlobal("fetch", createHiscoresFetchMock());
    vi.stubGlobal("caches", {
      open: vi.fn<CacheStorage["open"]>(async () => cache),
    });
  });

  it("caches successful anonymous summary responses by canonical game, mode, and name", async () => {
    const firstCtx = createExecutionContext();
    const firstResponse = await worker.fetch(
      incomingRequest("https://example.com/api/rs3/summary?ignored=true&mode=player&name=Zezima"),
      undefined,
      firstCtx.ctx,
    );
    await Promise.all(firstCtx.waitUntilPromises);

    expect(firstResponse.headers.get("cache-control")).toBe("public, max-age=3600, s-maxage=3600");

    const secondResponse = await worker.fetch(
      incomingRequest("https://example.com/api/rs3/summary?name=zezima&mode=player"),
      undefined,
      createExecutionContext().ctx,
    );

    await expect(secondResponse.json()).resolves.toMatchObject({
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
      undefined,
      createExecutionContext().ctx,
    );

    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      gameName: "RuneScape",
    });
    expect(cache.match).not.toHaveBeenCalled();
    expect(cache.put).not.toHaveBeenCalled();
  });

  it("fetches Leagues summaries and includes mode in the cache key", async () => {
    const firstCtx = createExecutionContext();
    const firstResponse = await worker.fetch(
      incomingRequest("https://example.com/api/rs3/summary?mode=leagues&name=Andre%20N"),
      undefined,
      firstCtx.ctx,
    );
    await Promise.all(firstCtx.waitUntilPromises);

    await expect(firstResponse.json()).resolves.toMatchObject({
      ok: true,
      gameName: "RuneScape",
      modeName: "Leagues",
      subjectName: "Andre N",
    });

    const secondResponse = await worker.fetch(
      incomingRequest("https://example.com/api/rs3/summary?name=andre%20n&mode=leagues"),
      undefined,
      createExecutionContext().ctx,
    );

    await expect(secondResponse.json()).resolves.toMatchObject({
      ok: true,
      modeName: "Leagues",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("fetches solo Ironman summaries and includes mode in the cache key", async () => {
    const firstCtx = createExecutionContext();
    const firstResponse = await worker.fetch(
      incomingRequest("https://example.com/api/osrs/summary?mode=ironman&name=City%20Morgue"),
      undefined,
      firstCtx.ctx,
    );
    await Promise.all(firstCtx.waitUntilPromises);

    await expect(firstResponse.json()).resolves.toMatchObject({
      ok: true,
      gameName: "Old School",
      modeName: "Ironman",
      subjectName: "City Morgue",
    });

    const secondResponse = await worker.fetch(
      incomingRequest("https://example.com/api/osrs/summary?name=city%20morgue&mode=ironman"),
      undefined,
      createExecutionContext().ctx,
    );

    await expect(secondResponse.json()).resolves.toMatchObject({
      ok: true,
      modeName: "Ironman",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("fetches OSRS-only Deadman summaries", async () => {
    const response = await worker.fetch(
      incomingRequest("https://example.com/api/osrs/summary?mode=deadman&name=Aplo"),
      undefined,
      createExecutionContext().ctx,
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
      undefined,
      createExecutionContext().ctx,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      gameName: "RuneScape",
      error: "Ultimate Ironman is not supported for RuneScape.",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});

function incomingRequest(
  input: string,
  init?: RequestInit,
): Request<unknown, IncomingRequestCfProperties<unknown>> {
  return new Request(input, init) as Request<unknown, IncomingRequestCfProperties<unknown>>;
}

function createExecutionContext(): {
  ctx: ExecutionContext;
  waitUntilPromises: Promise<unknown>[];
} {
  const waitUntilPromises: Promise<unknown>[] = [];
  return {
    ctx: {
      waitUntil(promise) {
        waitUntilPromises.push(promise);
      },
      passThroughOnException() {},
      props: undefined,
      tracing: createTracingStub(),
    },
    waitUntilPromises,
  };
}

function createTracingStub(): Tracing {
  const span: Span = {
    get isTraced() {
      return false;
    },
    setAttribute() {},
    end() {},
  };

  return {
    enterSpan(_name, callback, ...args) {
      return callback(span, ...args);
    },
    startActiveSpan(_name, callback, ...args) {
      return callback(span, ...args);
    },
    Span: class {
      get isTraced() {
        return false;
      }

      setAttribute() {}

      end() {}
    } as typeof Span,
  };
}

function createCacheStub(): Cache {
  const responses = new Map<string, Response>();
  return {
    add: vi.fn<Cache["add"]>(async () => {}),
    addAll: vi.fn<Cache["addAll"]>(async () => {}),
    delete: vi.fn<Cache["delete"]>(async () => false),
    keys: vi.fn<Cache["keys"]>(async () => []),
    match: vi.fn<Cache["match"]>(async (request) => responses.get(cacheKeyUrl(request))?.clone()),
    matchAll: vi.fn<Cache["matchAll"]>(async () => []),
    put: vi.fn<Cache["put"]>(async (request, response) => {
      responses.set(cacheKeyUrl(request), response.clone());
    }),
  };
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
