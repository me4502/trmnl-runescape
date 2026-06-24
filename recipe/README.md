# Setup in TRMNL dashboard

Use the Recipe **Polling** strategy.

## RuneScape polling URL

```txt
https://trmnl-runescape.maddy.tech/api/rs3/summary?mode={{ mode | default: "player" | url_encode }}&name={{ player_name | url_encode }}
```

## Old School polling URL

```txt
https://trmnl-runescape.maddy.tech/api/osrs/summary?mode={{ mode | default: "player" | url_encode }}&name={{ player_name | url_encode }}
```

If you're deploying this yourself, replace the hostname with your own worker URL.

No polling headers are required.

## Form fields

- `form-fields.yml` is the RuneScape recipe form.
- `form-fields-osrs.yml` is the Old School recipe form.
- The Liquid markup files are shared by both recipes.

## Returned JSON shape

```json
{
  "ok": true,
  "gameName": "RuneScape",
  "modeName": "Player",
  "subjectName": "Zezima",
  "headline": {
    "label": "Overall",
    "rank": 6366,
    "valueLabel": "Total level",
    "value": 3211
  },
  "entries": [],
  "generatedAt": "2026-06-05T12:14:00.000Z"
}
```
