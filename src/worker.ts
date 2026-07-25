import {
  getGameDefinition,
  getModeLabel,
  isSupportedGameMode,
  isSupportedMode,
} from "./hiscores/definitions.js";
import { buildHiscoreSummary, hiscoresErrorMessage } from "./hiscores/provider.js";
import type { HiscoreGameDefinition } from "./types.js";

const NAME_PARAM = "name";
const MODE_PARAM = "mode";
// HiScores update infrequently; hourly anonymous caching keeps TRMNL polling light.
const API_CACHE_TTL_SECONDS = 60 * 60;

const SUMMARY_ROUTE_MATCHER = /^\/api\/([^/]+)\/summary$/;

export default {
  async fetch(request): Promise<Response> {
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

        return handleSummary(request, url, game);
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
): Promise<Response> {
  const mode = url.searchParams.get(MODE_PARAM) ?? "player";
  if (!isSupportedMode(mode)) {
    return jsonResponse({
      ok: false,
      gameName: game.label,
      error: `Unsupported mode: ${mode}`,
      generatedAt: new Date().toISOString(),
    });
  }
  if (!isSupportedGameMode(game, mode)) {
    return jsonResponse({
      ok: false,
      gameName: game.label,
      modeName: getModeLabel(mode),
      error: `${getModeLabel(mode)} is not supported for ${game.label}.`,
      generatedAt: new Date().toISOString(),
    });
  }

  const name = url.searchParams.get(NAME_PARAM)?.trim() ?? "";
  if (name.length === 0) {
    return jsonResponse({
      ok: false,
      gameName: game.label,
      modeName: getModeLabel(mode),
      error: `Add ${game.label === "Old School" ? "an" : "a"} ${game.label} player name.`,
      generatedAt: new Date().toISOString(),
    });
  }

  const hasAuthorization = (request.headers.get("authorization")?.trim() ?? "").length > 0;

  try {
    return jsonResponse(
      await buildHiscoreSummary({
        definition: game,
        mode,
        name,
      }),
      200,
      hasAuthorization ? nonCacheableApiHeaders() : cacheableApiHeaders(),
    );
  } catch (error) {
    const upstreamError = hiscoresErrorMessage(error);
    if (upstreamError) {
      return jsonResponse(
        {
          ok: false,
          gameName: game.label,
          modeName: getModeLabel(mode),
          subjectName: name,
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
        modeName: getModeLabel(mode),
        subjectName: name,
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

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
  };
}
