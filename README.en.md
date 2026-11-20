# IdleArc Guide Helper

[Русская версия README](README.md)

Plan an IdleArc character around your class, character level, Monster Level and goal. Guide Helper runs in your browser and uses a local copy of the Season 2 game data. It works without a login or connection to your game account. You make the changes yourself in IdleArc.

This is an unofficial fan project.

To open the hub on Windows, double-click `start.bat`. On macOS or Linux, run `node scripts/serve.mjs` from the project folder.

Select English at the top of the hub. Guide Helper and Companion share that choice. Each app also has a language selector when opened on its own. Your browser remembers the language for that site. Select Русский to switch back. Russian mode shows English in-game names alongside Russian labels.

## Features

### Build planner

The planner has eight pages, in order. Start with Class and Levels, then use Skills, Gear, Forge and Gems. Finish with Next steps and Build. Each page explains how its recommendations fit your goal.

| Planner pages | What you can do |
| --- | --- |
| 1. Class and 2. Levels | Choose your class and goal, then enter your character level and Monster Level (ML). Character level grants skill points. ML determines loot and unlocks, including item tiers, built-in stats, gem rarities and sockets. Two-handed weapon drops enter the general pool at ML 25. The Torch starts dropping at ML 50. |
| 3. Skills | Compare the automatic plan with a manual allocation. See the points spent in each branch, the effective rank of each skill and the total bonuses. |
| 4. Gear and 5. Forge | Find items for each slot and see why they fit. The Forge upgrades the slot. Your biome determines which upgrade materials you can farm. The Forge page shows upgrade order, costs and success chances. |
| 6. Gems | Compare gems for your weapon, Torch, armor and jewelry. Each slot lists the recommended gem, its effect, the rarity available at your ML and alternatives. The page also shows when to change your main gem, which secondary stats to prioritize and when to upgrade sockets. |
| 7. Next steps and 8. Build | Use the checklist for your level, ML and goal. For example, look for a Torch when you reach ML 50. Review stat priorities, talismans and pets. Copy the plan as text for Discord or share a build code that another player can import. The browser also saves your build. |

#### Skill points

You gain one class point at level 1, then one every three character levels. Tier 2 requires five points in the same branch. Tier 3 requires ten. Some skills also require a point in another skill.

When enough points are available, the planner starts with one point in each of the three branches. It divides the remaining points according to your goal, then moves points into stronger branches where they can unlock another tier. The branch breakdown explains each allocation.

The `+All Class Skills` panel accounts for bonuses from a Torch, Sage Diadem and legendary pets. Set the slider from 0 to 25. The panel shows how each stat changes and which effects reach their caps. A learned skill's effective rank equals the points you invested plus the bonus. Only invested points count toward branch unlocks.

In manual mode, use the `+` and `−` buttons beside a skill. Bonuses update immediately. The planner flags excess points, ranks above the maximum, locked tiers and missing prerequisites. Totals include Attack Damage, critical hits, Double Hit, Double Damage, Pet Damage and farming stats.

#### Equipment

The character screen has 13 positions. The ten standard equipment types are main hand, offhand, Torch, chest, head, hands, feet, amulet, ring and belt. The screen shows two ring positions and two talisman positions. It also marks slots that your class or a two-handed weapon prevents you from using.

An implicit is an item's built-in stat. An affix is a prefix or suffix that adds a stat. For each slot, the recommendations show the family, the item name at your ML and its implicit at the expected drop tier. The Codex gives the full range from T1 through T6. The planner ranks compatible prefixes and suffixes, with up to four candidates of each kind. It also identifies Drop Bonuses and the gem to look for.

### Passive Tree

All classes share this tree. The Passive Tree tab starts from the class, goal and level in your planner. The snapshot contains all 200 rows across 20 tiers. You gain one passive point per character level. Spending 20 points in a tier opens the next one.

The planner spends enough points to reach deeper, stronger nodes. It selects stats that fit your goal, such as attack, pet damage, critical hits, defense or farming. Every tenth row has milestone nodes that cost one point each. The page shows the recommended milestones and total bonuses.

### Calculators

| Calculator | What it covers |
| --- | --- |
| Damage | Critical strike chance above 100% converts to Critical Damage. Each full 100% of Double Hit adds a guaranteed hit. Each full 100% of Double Damage adds a multiplier step. The model includes Boss Damage and Shadow Echo. |
| Defense and Retaliation | Damage Reduction has a 95% soft cap and a 99% hard cap. At least 1% of a hit gets through. Retaliation uses `Reflecting% × Defense`. A block increases Retaliation damage by 50%. |
| Gems and progression | Calculate gem values, Mastery costs, pet compounding and class skill points. |

### Codex

Search by name or filter equipment by class and slot. The Codex lists all 40 item families, their names from T1 through T6 and the first awakened form (A1) where available. It includes implicit values by tier, compatible affixes and drop requirements.

Other sections cover affixes, Drop Bonuses from T2 through T9, gems, sockets, class skills, talismans, inscriptions and pets. Look up stats, stances, Mastery, ML unlocks, biomes, Convergence, guild progression and class changes here.

### Tips and Sources

Find explanations of effect caps, diminishing returns on Lucky and how your weakest equipped pet limits compounding. For example, Slayer's applies to boss encounters, with a reduced effect in Elemental Conflux. This tab links the sources and explains where the guide uses a model or an uncertain value.

## Run locally

Use Node.js 18 or later for the local server. The project runs from its folder without a package installation. [Download Node.js](https://nodejs.org/).

### Windows

Double-click `start.bat` to start the hub. The launcher looks for Node.js in `PATH` and in `C:\Program Files\nodejs`. If Node.js is missing or too old, the launcher offers to open the download page.

The hub starts at port 8080. To start at a different port, run `start.bat 8090`. To open Guide Helper alone with `server.js`, run `start.bat arc`. That mode starts at port 5173.

If the same app already uses the port, the launcher reuses it. If another program uses the port, the launcher tries the next one. It waits for a response before opening the browser. By default, the launcher listens on `127.0.0.1` for local access. To stop a server you started, press `Ctrl+C` in its window or close the window.

### Terminal on any operating system

Run one of these commands from the project folder.

```bash
node scripts/serve.mjs             # Start the hub at port 8080 and open the browser
node scripts/serve.mjs 8090        # Start the hub at port 8090 if available
node scripts/serve.mjs --arc       # Start Guide Helper alone at port 5173 if available
node scripts/serve.mjs --no-open   # Print the address without opening the browser
node scripts/serve.mjs --lan       # Allow access from other devices on the local network
```

To run a server directly, choose the command for the app you want.

```bash
node server.js            # Guide Helper at http://localhost:5173
node hub/hub-server.js    # Hub at http://localhost:8080
```

On macOS or Linux, `PORT=8080 node server.js` starts Guide Helper on port 8080. The direct Guide Helper server listens on all interfaces by default. Use the launcher for access from your computer only.

You can serve the Guide Helper frontend from a static host such as GitHub Pages or Netlify, or run `python3 -m http.server`. Use the Node.js servers for the combined hub, build API and artwork downloads.

## Tests

Run the smoke tests from the project folder. The smoke suite imports browser modules and renders the tabs with a small implementation of the browser DOM. The commands below run on Node.js 22.23.2.

```bash
node tests/smoke.mjs
```

The suite covers these cases.

- Five classes, five goals and five levels for skill allocation. It tests branch use, goal priorities, skill prerequisites and manual allocations.
- Effective ranks and caps from `+All Class Skills`. Bonus ranks cannot unlock a new branch tier.
- Gear and gem choices for ten standard equipment types, the 13-position character screen, all 40 item families, Forge upgrades and build codes.
- Critical strike chance above 100%, Damage Reduction caps, Retaliation, gems, pet compounding and Mastery. Launcher tests cover `start.bat` and `scripts/serve.mjs`, including Windows line endings, encoding and command characters.
- English views, control labels, all eight planner pages for each class and exported build text. The full command includes this English run.

The HTTP tests need a running Guide Helper server. On Windows, use `start.bat arc`. On any operating system, you can instead start it with this command.

```bash
node scripts/serve.mjs --arc --no-open
```

In a second terminal, run the HTTP suite against the port printed by the launcher. The default port is 5173.

```bash
node tests/http.mjs
```

For another port on macOS or Linux, use `PORT=5174 node tests/http.mjs`. In Windows Command Prompt, run `set PORT=5174` before the test command. The test follows JavaScript imports over HTTP and inspects their content types, versioned paths, build metadata and artwork API responses.

### Browser updates

Guide Helper serves files with `Cache-Control: no-store`. Its Node.js server inserts a build-specific entry point into the HTML, such as `/v/<build>/src/app.js`. Each release gets distinct module URLs. The header, footer and `/api/build` show the build ID.

If a cached page, proxy or browser prevents startup, the red error panel shows the error and build IDs. Select Reload to try again. If the problem persists, include the panel text in your report.

When you change the data, update `DATA_META.build` in `src/data/systems.js`. Update both the `<meta name="build">` value and the expected build shown by the error panel in `index.html`. The tests compare the HTML metadata with the app build.

## Project structure

| Path | Contents |
| --- | --- |
| `start.bat`, `scripts/serve.mjs` | Windows and cross-platform launchers. They select a port, wait for the server and open the browser. |
| `index.html`, `src/app.js`, `styles/app.css` | Guide Helper page, tab navigation and dark theme with Item Codex rarity colors. |
| `server.js`, `hub/hub-server.js` | Guide Helper static server and the two-app hub server. |
| `hub/language.js`, `src/i18n.js` | Shared language selection and Guide Helper translation helpers. |
| `src/data/classes.js` | Five classes and their skills, values per point, caps and prerequisites. |
| `src/data/items.js` | Forty item families, tier names, T1–T6 implicits, affixes, T2–T9 Drop Bonuses, gems, sockets and drops by ML. |
| `src/data/systems.js` | Stats, attributes, stances, Mastery, pets, talismans, runes, guilds and progression. |
| `src/data/builds.js` | Stances, stat priorities, skill weights, gear by slot and goal, gems and the stat-to-affix mapping. |
| `src/data/passives.js`, `src/data/forge.js`, `src/data/biomes.js` | Passive tree rows, slot upgrade costs and biome unlocks. |
| `src/core/calc.js`, `src/core/planner.js` | Game formulas, damage models, point allocation, bonus ranks and caps, gear and gem plans, validation and build code import and export. |
| `src/ui/*.js` | Planner, Passive Tree, Calculators, Codex, Tips and Sources. |
| [Research notes](docs/RESEARCH.en.md) | Sources, game mechanics, limitations and updates. |
| `tests/smoke.mjs`, `tests/http.mjs` | Logic, data and rendering tests, plus HTTP tests for module imports, content types and versioned paths. |

## Data sources

The research snapshot covers IdleArc 1.3.1, Season 2, as of October 4, 2026. The patch date was September 25. The Guide Helper data records a further source review on October 5. Game values can change after a patch.

- [Official IdleArc website](https://idlearc.com/)
- [Official 1.3.1 patch notes for Season 2: The Forge](https://idlearc.com/patch-notes/1-3-1)
- [Official classes and skill trees](https://idlearc.com/classes)
- [Official guild tree simulator](https://idlearc.com/guild-tree)
- The community wiki includes the Season 2 guide that the project research lists as endorsed. [IdleArc Wiki](https://idlearc.fandom.com/wiki/IdleArc_Wiki) and [Season 2 Progression & Strategy Guide](https://idlearc.fandom.com/wiki/Guide:Season_2_Progression_%26_Strategy_Guide).

## Where the numbers come from

The snapshot records skill points, tier requirements and all 90 class skills. Item data includes affix ranges, tier-specific Drop Bonuses and gem formulas. Pet data includes hatch chances, guarantees after repeated attempts and compound caps. The sources also cover talismans, Mastery, ML unlocks, Convergence, the Guild Skill Tree and the 1.3.1 balance changes.

Each skill in `src/data/classes.js` records its `branch`, `tier`, maximum rank (`max`, either 5 or 10) and value per point (`perPoint`). It includes an effect limit (`cap`) or prerequisite (`requires`) where applicable. This includes the Druid branches Lodge, Tunnels and Symbiosis. The Skills page groups skills by tier and shows how many points each accepts.

The smoke test compares the branch, tier and maximum rank for all 90 skills with the reference table bundled in the repository. After a game update, compare new game data with the snapshot before updating the table.

The damage calculator estimates the expected multiplier per hit. It models excess critical strike chance, full 100% increments of Double Hit and Double Damage, and Damage Reduction caps. The game does not publish the full order of its damage calculations. Use the estimate to compare builds. Exact damage per second requires more information.

To update a snapshot, edit the relevant files in `src/data/*.js` and the review date. Update the build ID and run both test suites. Follow the [data update procedure](docs/RESEARCH.en.md#6-how-to-update-the-data).

## The two sides of the hub

The `hub/` folder contains a shell around two independent apps. Select an app in the header or click the logo to switch sides. The hub also handles `Alt+Tab` when the browser receives the shortcut.

| Side | App |
| --- | --- |
| A | IdleArc Guide Helper runs from the repository root. |
| B | IdleArc Companion runs from the offline copy of `idlearc-companion-web` in `hub/companion/`. This copy includes the Passive tab. |

To start the hub manually, run the following command and open the address it prints. The default address is `http://localhost:8080`.

```bash
node hub/hub-server.js
```

The hub starts or reuses a Guide Helper server on `127.0.0.1:5173`. If another program uses that port, the hub tries the next one. If Guide Helper stops, the hub starts it again on the next request. Reload after a few seconds.

The hub forwards `/arc/*` and the artwork endpoints `/api/art/status`, `/api/art/fetch` and `/api/art/upload` to Guide Helper. The hub serves its own `/api/build` response. It also tries another port if 8080 is busy. On macOS or Linux, `HOST=0.0.0.0 node hub/hub-server.js` allows access from the local network.

### Companion Passive tab

Select your class and profile. The five profiles are Balanced, Boss killer, Farm / loot, Tank and Pet damage. All five classes are available. Enter your point budget. The planner works down the tree one row at a time and spends 20 points in a tier before it advances.

A row needs at least one point in the preceding row. A tier needs enough points in the preceding tier. The editor prevents you from removing a point that supports lower rows.

Read the class recommendations, top eight stat priorities and next eight investments. Select Apply plan to write the allocation to Build Studio. The tab follows the shared Russian or English language setting.

### Game artwork

Guide Helper includes all 202 item icons and their `index.json` mapping in `assets/items/`. The download command is `node scripts/fetch-art.mjs`. The first source in `IMAGE_BASES` is the Companion host at `idlearc-companion-web-production.up.railway.app/static/images/items/`. For the browser and server download options, see the [item icon guide](assets/items/README.en.md).

The original download report traced `fetch failed` to missing network access and `HTTP 403` to Cloudflare on `idlearc.com`. The project used the existing Companion source to retrieve the icons.

Companion keeps its own artwork in `hub/companion/assets/`. It includes 224 item icons, 28 pet images, 90 class skill icons, a logo and five screenshots.
