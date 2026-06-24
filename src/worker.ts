import {
  getGameDefinition,
  getModeLabel,
  isSupportedGameMode,
  isSupportedMode,
} from "./hiscores/definitions.js";
import { buildHiscoreSummary, hiscoresErrorMessage } from "./hiscores/provider.js";
import type { HiscoreGameDefinition, ModeKey } from "./types.js";

const NAME_PARAM = "name";
const MODE_PARAM = "mode";
// HiScores update infrequently; hourly anonymous caching keeps TRMNL polling light.
const API_CACHE_TTL_SECONDS = 60 * 60;
const API_CACHE_NAME = "trmnl-runescape-summary";

const SUMMARY_ROUTE_MATCHER = /^\/api\/([^/]+)\/summary$/;

export default {
  async fetch(request, _env, ctx): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders(),
          ...nonCacheableApiHeaders(),
        },
      });
    }

    if (request.method === "GET") {
      const url = new URL(request.url);

      const summaryRoute = url.pathname.match(SUMMARY_ROUTE_MATCHER);
      if (summaryRoute) {
        const game = getGameDefinition(summaryRoute[1]);
        if (!game) {
          return jsonResponse(
            {
              ok: false,
              error: `Unsupported game: ${summaryRoute[1]}`,
              generatedAt: new Date().toISOString(),
            },
            404,
          );
        }

        return handleSummary(request, url, game, ctx);
      }
    }

    return jsonResponse(
      {
        ok: false,
        error: "Not found.",
        generatedAt: new Date().toISOString(),
      },
      404,
    );
  },
} satisfies ExportedHandler;

async function handleSummary(
  request: Request,
  url: URL,
  game: HiscoreGameDefinition,
  ctx: ExecutionContext,
): Promise<Response> {
  const mode = url.searchParams.get(MODE_PARAM) ?? "player";
  if (!isSupportedMode(mode)) {
    return jsonResponse(
      {
        ok: false,
        gameName: game.label,
        error: `Unsupported mode: ${mode}`,
        generatedAt: new Date().toISOString(),
      },
      400,
    );
  }
  if (!isSupportedGameMode(game, mode)) {
    return jsonResponse(
      {
        ok: false,
        gameName: game.label,
        error: `${getModeLabel(mode)} is not supported for ${game.label}.`,
        generatedAt: new Date().toISOString(),
      },
      400,
    );
  }

  const name = url.searchParams.get(NAME_PARAM)?.trim() ?? "";
  if (name.length === 0) {
    return jsonResponse(
      {
        ok: false,
        gameName: game.label,
        error: `Add a ${game.label} player name.`,
        generatedAt: new Date().toISOString(),
      },
      400,
    );
  }

  const hasAuthorization = (request.headers.get("authorization")?.trim() ?? "").length > 0;
  const cacheKey = hasAuthorization ? null : summaryCacheKey(request, game, mode, name);

  if (cacheKey) {
    const cache = await caches.open(API_CACHE_NAME);
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
  }

  try {
    const response = jsonResponse(
      await buildHiscoreSummary({
        definition: game,
        mode,
        name,
      }),
      200,
      cacheKey ? cacheableApiHeaders() : nonCacheableApiHeaders(),
    );

    if (cacheKey) {
      ctx.waitUntil(putApiCache(cacheKey, response.clone()));
    }

    return response;
  } catch (error) {
    const upstreamError = hiscoresErrorMessage(error);
    if (upstreamError) {
      return jsonResponse(
        {
          ok: false,
          gameName: game.label,
          error: upstreamError,
          generatedAt: new Date().toISOString(),
        },
        200,
        nonCacheableApiHeaders(),
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(
      {
        ok: false,
        gameName: game.label,
        error: message,
        generatedAt: new Date().toISOString(),
      },
      500,
      nonCacheableApiHeaders(),
    );
  }
}

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = nonCacheableApiHeaders(),
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(),
      ...headers,
    },
  });
}

function summaryCacheKey(
  request: Request,
  game: HiscoreGameDefinition,
  mode: ModeKey,
  name: string,
): Request {
  const cacheUrl = new URL(request.url);
  cacheUrl.pathname = `/api/${game.key}/summary`;
  cacheUrl.search = "";
  cacheUrl.searchParams.set(MODE_PARAM, mode);
  cacheUrl.searchParams.set(NAME_PARAM, name.toLowerCase());

  return new Request(cacheUrl.toString(), { method: "GET" });
}

function cacheableApiHeaders(): Record<string, string> {
  return {
    "cache-control": `public, max-age=${API_CACHE_TTL_SECONDS}, s-maxage=${API_CACHE_TTL_SECONDS}`,
    vary: "authorization",
  };
}

function nonCacheableApiHeaders(): Record<string, string> {
  return {
    "cache-control": "no-store",
    vary: "authorization",
  };
}

async function putApiCache(cacheKey: Request, response: Response): Promise<void> {
  const cache = await caches.open(API_CACHE_NAME);
  await cache.put(cacheKey, response);
}

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
  };
}
