# TRMNL RuneScape HiScores

A TRMNL Recipe, powered by a small Cloudflare Worker microservice, for RuneScape HiScores ranks.

Currently supports:

- RuneScape
  - Player HiScores
  - Ironman HiScores
  - Hardcore Ironman HiScores
  - Leagues HiScores
- Old School
  - Player HiScores
  - Ironman HiScores
  - Hardcore Ironman HiScores
  - Ultimate Ironman HiScores
  - Deadman Mode HiScores
  - Leagues HiScores

While I would like to support Group Ironman, neither RuneScape nor Old School provide an API
for this data in a feasible way. I hope this changes in the future 😌.

## Data shown

- Overall leaderboard rank.
- Total level/event count as secondary context.
- Best-ranked categories ordered by leaderboard position, including skills and supported activities/bosses.

## Leagues support

Leagues mode uses Jagex's current/latest Leagues HiScores endpoints. Historical League season selection is not supported due to the data not being available via the API. If this changes in the future I am happy to add it, although unsure how useful it would actually be (maybe to compare prior leagues to current?).

## Deployment

Deploy to Cloudflare Workers:

```bash
yarn deploy
```

## TRMNL Setup

See [recipe/README.md](./recipe/README.md) for instructions on setting up the Recipe in the TRMNL dashboard.
