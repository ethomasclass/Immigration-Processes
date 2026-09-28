# Paper Trail: An Immigration Card Game

A 20-minute classroom deckbuilding game about U.S. immigration pathways, built for Chromebooks and hosted on GitHub Pages.

Students play a fictional immigrant: **Priya** (India, H-1B → green card), **Lukas** (Germany, same path), or **Marco** (Mexico, H-2A seasonal guest worker). Each year they open a pack of cards, then file forms on their "Paper Trail" in the right order. They have to manage documents, fees, lotteries, backlogs and waiting lines.

Partners sit side by side on separate computers and type the same **table code**. The code sets that game's world events, so both games stay in sync with no network connection.

- **Play:** `index.html`
- **Teacher guide:** `teacher.html` (lesson plan, table codes, debrief questions, sources)
- **Image credits:** `credits.html`

## Publish on GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick your branch and the `/ (root)` folder, then save.
4. After a minute, the game is live at `https://<your-username>.github.io/<repo-name>/`.

Share a link with the table code built in, e.g. `…/index.html?code=MAPLE`.

## Run locally

It uses ES modules, so it needs a local web server (opening the file directly won't work):

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

## Project layout

| Path | What it is |
|---|---|
| `js/engine.js` | Game rules: years, packs, filing, lotteries, the Visa Bulletin, seasons |
| `js/data/cards.js` | Every card, including the 8th-grade educational text |
| `js/data/characters.js` | The three characters |
| `js/data/scenarios.js` | Table codes and the yearly news events |
| `js/main.js` | Screens, pack opening, drag-and-drop, and the end screen |
| `js/fx.js` | Particles, stamps and synthesized sounds (no audio files) |
| `tests/simulate.mjs` | Plays hundreds of automated games to check balance (`node tests/simulate.mjs`) |

## Accuracy

Facts, fees and backlogs reflect official sources as of **September 2026**; the teacher guide lists them. Immigration rules change often, so update `js/data/cards.js` and `js/engine.js` (the `CHARTS` Visa Bulletin model) when they do.
