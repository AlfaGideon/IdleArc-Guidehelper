# IdleArc research for Guide Helper

[Russian original](RESEARCH.md)

The October 4, 2026 snapshot covers game version 1.3.1, *Season 2: The Forge*. The patch came out on September 25, 2026. The final two sections record additions from October 5, 2026.

## 1. Research sources

| Source | What the researchers used it for |
| --- | --- |
| [Official IdleArc website](https://idlearc.com/) | Season announcements, store links, the web game and the cookie policy. |
| [Official 1.3.1 patch notes](https://idlearc.com/patch-notes/1-3-1) | The full list of new systems, reworked mechanics and balance changes for Season 2. |
| [Official classes page](https://idlearc.com/classes) | The five classes, their skill trees, skill points and tier requirements. |
| [Official guild tree simulator](https://idlearc.com/guild-tree) | Tiers, skill families, Ascension, resets and Bonus Boost. |
| [IdleArc Wiki](https://idlearc.fandom.com/) | The community reference for classes, stats, the Item Codex, gems, pets, runes, talismans, progression, Convergence and activities. The research also used the endorsed Season 2 guide. |
| App Store and Google Play | Game description, features, client version and player reviews. The listings provided context on players, monetization and seasons. |
| Reddit and the player community | Developer activity, player priorities and third-party tools. |
| IdleArc Companion (community project) | A reference for the scope of Season 2 data. It covered 40 gear families, 28 pets, 7 rune types, 24 Rune Words, 90 class skills and 500 passive nodes. At the time of the research, its source code was unavailable publicly. Guide Helper was developed independently. |

## 2. Game mechanics that affect builds

### Classes and skills

| Class | Branches |
| --- | --- |
| Warrior | Might, Strength, Finesse |
| Archer | Marksmanship, Hunting, Beastmaster |
| Mage | Arcane, Destruction, Chaos |
| Rogue | Assassin, Shadow-walker, Thief |
| Druid (new in Season 2) | Lodge, Tunnels, Symbiosis |

You gain one class skill point at level 1 and one more every three levels. Tier 2 requires five points in the same branch. Tier 3 requires ten. Some skills also require a point in another skill.

A Torch, Sage Diadem or legendary pet can grant `+All Class Skills`. The bonus raises the effective rank of each learned skill. An uncapped effect can continue to grow beyond the maximum rank you can buy with points.

Rogues can equip two weapons. Each dagger gives +50% Double Hit, while claws give high Critical Strike Chance. The first class change is free. Each later change costs 25 Arcstone. The cooldown grows to one week, and equipment converts to the new class.

### Stats and formulas

Attack Damage (AD) is the character's attack stat. Pet Damage has its own calculation. Pet Mastery, attributes and class modifiers have different effects on the two damage totals.

| Attribute | Gain per point |
| --- | --- |
| Strength | +0.75% AD, +0.5% Max HP, +0.5 Retaliation |
| Dexterity | +0.05% Dodge, +0.1% Pet Damage |
| Intelligence | +0.38% AD, +0.05% Pet Damage, +0.2% Double Damage |

Critical Strike Chance above 100% converts to Critical Damage at a 1:1 ratio. Every full 100% of Double Hit (DH) guarantees an extra strike. At 250%, you get three hits and a 50% chance of a fourth. Extra hits stop once the enemy dies. Double Damage (DD) works in multiplier steps. At 250%, you deal ×3 damage, with a 50% chance of ×4.

Damage Reduction (DR) has a soft cap of 95%. Above that point, each additional percentage point has 10% of its usual effect. The hard cap is 99%, so at least 1% of each hit gets through. Flat DR from Wardplate retains its effect as Monster Level (ML) rises.

Retaliation triggers on each monster attack. Its damage uses `Reflecting% × Defense`. Blocking increases Retaliation damage by 50%. The Bulwark stance sets Dodge to 0%.

| Stance | Focus |
| --- | --- |
| Aggressive | Attack Damage |
| Beastmaster | Pet Damage |
| Harmony | A balance of character and pet damage, with stronger scaling after ML 180 |
| Bulwark | Retaliation |

### Items

Item rarity ranges from T1 Normal to T6 Infernal. The number of affix slots increases from zero to five. An affix is a prefix or suffix that adds a stat. Its value multiplier rises from ×1 at T1 to ×2.5 at T6. Each additional upgrade level adds 3%.

The catalog records 26 affixes, their roll ranges and compatible slots. Drop Bonuses are separate. There are 21 bonuses across T2–T9. T7, T8 and T9 bonuses correspond to Gilded, Radiant and Mythic items.

#### Forge steps and costs

In Season 2, the Forge upgrades the equipment slot through Tier, Enhance and Awaken. Each new tier opens another affix position and grants a Free Pick. Gear Score counts occupied slots.

The Item Codex Forge data uses `source_version 2026-09-29-003`. The table gives the maximum Enhance level (`+N`) and the cost parameters for each tier. Together the tiers cover slot ranks 0 through 100.

| Tier | Max +N | Base gold | Fragment | Fragment multiplier | Base failure chance | Threshold for extra failure chance |
| --- | ---: | ---: | --- | ---: | ---: | ---: |
| T1 | 4 | 200 | Iron | 1 | 0% | None |
| T2 | 9 | 1,200 | Steel | 1 | 0% | 6 |
| T3 | 14 | 7,000 | Mithril | 0.75 | 5% | 5 |
| T4 | 19 | 40,000 | Adamantine | 1 | 10% | 8 |
| T5 | 24 | 200,000 | Celestial | 1.5 | 15% | 10 |
| T6 | 30 | 1,200,000 | Infernal | 2.5 | 25% | 12 |

For a step to the target Enhance level, `gold = round(base × (1 + 0.45 × target))` and `fragments = ceil(target × multiplier)`. Add 2.5 percentage points to the base failure chance per level above the tier threshold. Add another 1.5 percentage points per level above +19. Failure chance caps at 85%.

Awaken has up to five ranks. The cost estimate rises by ×2.5 per rank. The researchers found an exact base cost only for T6. The Forge smoke test compares steps, fragments and chances with the Item Codex.

#### Equipment screen and artwork

The character silhouette has four rows in a 3+3+3+4 layout.

| Row | Slots from left to right |
| --- | --- |
| 1 | Torch, head, amulet |
| 2 | Weapon, chest, second hand |
| 3 | Ring 1, belt, ring 2 |
| 4 | Talisman 1, hands, feet, talisman 2 |

The second hand holds a Warrior's shield, an Archer's quiver, a Mage's book or a Rogue's second weapon. A Druid uses a two-handed staff, so the second hand is locked. The card front shows the item image, Forge tier and `+N`. The back shows the tier's built-in stat (implicit), affixes, gems and next upgrade cost. Both sides are opaque. The card uses `backface-visibility` and `visibility` to hide the front when it flips, preventing mirrored text from showing through.

The Item Codex Appearance section names the artwork files under `static/images/items/*.webp`. The research estimated about 250 files across all tiers and Awaken ranks. The repository includes 202 item icons. Guide Helper can fill `assets/items/` in three ways.

1. Select `Download game images through browser`. The browser downloads the icons and sends them to the local server with `POST /api/art/upload`. This works when only the browser has internet access.
2. Select `Download game images` to call `POST /api/art/fetch`.
3. Run `node scripts/fetch-art.mjs`.

For missing images, Guide Helper draws its own SVG icons for all 40 families.

#### Biomes, drops and slot tiers

Monster Level determines which biomes you can farm. Each Forge tier needs materials from monsters in a particular biome. A promotion also needs essence. The research used the wiki's Biomes pages, individual biome pages and Item Codex Upgrade Costs.

| Forge tier | Biome | ML | Fragment |
| --- | --- | ---: | --- |
| T1 | Verdant Woods | 1 | Iron |
| T2 | Scorched Sands | 10 | Steel |
| T3 | Murky Depths | 30 | Mithril |
| T4 | Frozen Peaks | 45 | Adamantine |
| T5 | Shadow Realm | 65 | Celestial |
| T6 | Infernal Pits | 90 | Infernal |

Shadow Realm monsters drop Void Core, Wisp Fragment, Horror Tentacle, Assassin's Mark and Stalker Claw. Infernal Pits monsters drop Imp Horn, Mage's Ember, Demon Plate, Molten Core and Lord's Sigil.

The separate `TIER_PROMOTION` table lists costs for advancing from one tier to the next. T4 to T5 costs 1,125,000 gold, 1 Legendary Essence, 18 Dragon Frost, 12 Glacial Heart and 8 Hydra Scale. Success chance is 65%. The model in `src/data/biomes.js` uses `forgeGateAtMl`, `forgeGateForTier` and `promotionFromTier`. The biome smoke test covers these slot limits.

The recommendation's `tierInfo` describes the item tier most likely to drop at your ML. Its `forge.tier` describes the highest slot tier available from your biomes. At ML 65, for example, T3 is the most common item drop and the slot can reach T5.

On the Gear page, the Forge and biomes table lists material sources by tier. The card front shows both the drop tier and slot limit. The back gives the biome requirement and promotion cost. The Forge page labels locked tiers with the ML needed to farm their materials.

#### Jewelry, armor and recommendations

Warrior's, Ranger's, Scholar's and Adventurer's are jewelry lines that any class can wear. The planner scores each line by how its attributes contribute to the chosen goal. It uses the per-point values from the wiki's Stats page, listed in the attribute table above. The game does not publish the exact class conversion formula. The planner estimates ×1.25 for the class's own attribute and ×0.4 for Attack Damage from another attribute.

In the research examples, Warrior used Warrior's jewelry with a Scholar's Belt. Archer, Rogue and Druid used Adventurer's jewelry with a Scholar's Belt. Mage used Scholar's jewelry. Your goal affects the result. Select a Jewelry line on the Gear page to override the recommendation. The browser saves the choice. The smoke tests cover goal-based jewelry selection, manual line selection and the attribute table.

All classes can wear armor families such as Wardplate, Visionary Hood and Sage Diadem. The Gear page explains this alongside the recommendations.

The engine in `src/core/recommend.js` chooses an item for each slot, gems, talismans and a Forge upgrade order. It compares the goal's stat priorities (`statPriorityFor`) with each family's guaranteed implicit and available affixes. An implicit has twice the weight of an affix before the slot multiplier. The main weapon has a weight of 2.2, armor ranges from 1.4 to 1.8, and jewelry has a weight of 0.9. For example, All Attributes on a ring does not automatically outrank a sword.

The model ranks `+All Class Skills` above the first stat priority. It gives the main attribute half the highest stat weight when Attack Damage is a priority. The Forge uses the same weights, favoring the Torch and weapon when available. The recommendation tests cover automatic choices, different goals and restoration after a manual change.

| Goal or class in the research examples | Recommended items or gems |
| --- | --- |
| Farming | Bloodweave Vest, Sage Diadem, Pathfinder Treads and Amber |
| Bosses | Greatsword, Swiftstride Boots and Garnet |
| Pets | Jade |
| Druid | Gnarled Stick |

By default a slot uses the recommendation (`manual: false`). The chosen family fits the goal, and its item tier follows drops at your ML. Editing the slot sets `manual: true`. The planner keeps the override when the goal or ML changes. Select `↺ Restore recommendation` to reset one slot. Select `Apply recommendation to all slots` to clear all manual changes.

#### Planner pages and saves

The first four planner pages cover Class and goal, Levels, Skills and Gear. The next four cover Forge, Gems, Next steps, and Build and saves. It renders only the active page. The historical measurement counted 782 interface nodes on the largest page, compared with about 2,800 when all pages rendered together. The researchers reported immediate page switches. Smoke tests cover separate screens and the number of nodes rendered at once. The browser saves the current page in `localStorage` with the rest of the build.

The Forge page summarizes slots, total rank, slots by tier and maximum levels. Its upgrade advice lists cheap steps, slots ready for promotion and the weakest slots. Each slot card lets you choose an item, tier, Enhance level and Awaken rank. Two progress bars show level within the tier and overall slot rank. The card lists gold, fragments and success chance for the next step. Controls lower or raise the level by one, fill the tier or promote the slot. The Gear page concentrates on the character layout and what to look for in each slot.

During a live test, reading `window.localStorage` itself threw `SecurityError`. This can happen in private browsing or when an embedded page lacks storage access. The `safeStorage` function guards both the property read and a trial write with `try`. Without that guard, the module can fail before startup. A smoke test launches a separate process with storage accessors that throw.

The fallback screen in `index.html` shows the entry file and the HTTP status returned for its module. The `window.__boot.graph` flag from `app.js` indicates whether execution reached the app. The Reload without cache button adds a timestamp to the URL.

The planner takes a snapshot at the beginning and end of a render. It also listens for clicks, input, `pagehide`, `beforeunload` and `visibilitychange`, and attempts a save every four seconds. This preserves recent changes across an unexpected reload when a persistent channel is available.

The four save channels are `localStorage`, `sessionStorage`, `window.name` and memory. It restores the newest readable snapshot. If browser storage is blocked, `window.name` can retain the build in the same browsing window. Clearing one channel can leave a recoverable copy in another. Memory alone lasts only while the page remains open.

Before overwriting a save, the planner backs up the previous version under `iac:helper:state:v1:prev`. A button restores that copy. Every page shows the save time in HH:MM:SS and the storage channel, so you can see whether it survives a reload. If an existing browser snapshot cannot be read, the planner protects it and offers to restore the previous version.

The state key `iac:helper:state:v1` covers class, goal, levels, points, equipment and Forge progress. The key `iac:helper:loadouts:v1` holds three named loadouts.

### Pets, runes, gems and talismans

Pets have four equipment slots. The hatch chances for Common, Uncommon, Rare, Epic and Legendary are 50%, 25%, 15%, 8% and 2% respectively. The pity thresholds are 20 hatches for Epic and 60 for Legendary. Compounding raises a pet's bonuses. Its effective compound level can exceed the weakest equipped pet by up to 10 levels, or 25 on the Permanent realm. The rarity caps are +10 for Uncommon, +20 for Rare and +30 for Epic. Legendary has no rarity cap.

Runes occupy a grid and combine into Rune Words. Exchange three runes of the same shape and one ruby for a reroll. Premium unlocks the Reforge Workshop.

The four gem families are Garnet, Jade, Lapis and Amber. The same gem gives different effects in a weapon, Torch, armor or jewelry slot. The five rarities are Rough, Cut, Polished, Brilliant and Flawless. Cut gems introduce secondary stats, with one to three bonuses depending on rarity. Fusion combines three gems into one. Flawless comes only from drops starting at ML 160.

The gem formula is `base × rarity × (quality/100) × (1 + 0.04 × socket level)`. Each socket level adds 0.04 to the socket multiplier.

Each of the 21 Drop Bonuses has a category, a minimum tier and values for T2–T9. The five categories are Offensive, Defensive, Sustain, Farming and New Mechanic. The research described these values as a scale for estimating skills whose formulas were unavailable. The bundled 90 class skills use the per-point values and caps from the game data.

The four talisman types are Fury, Spirit, Iron and Recovery. Infusion runs from +0 to +9 with a 10% Lucky chance for a free level. There are eight Sacrifice Bonuses. Inscription chances are 75% Common, 20% Greater and 5% Perfect. A draft guarantees at least one Greater in five drafts and one Perfect in eleven.

### Progression

| ML | Unlock |
| ---: | --- |
| 20 | Gems and sockets |
| 30 | Elemental Conflux |
| 50 | Torch |
| 90 | Triple rare material drops in Conflux |
| 160 | Flawless gems |
| 260 | T6 items and the effect of Lucky on Gilded drops |
| 350 | The Convergence |

The original ML 260 entry uses the ambiguous phrase “Gilded-лук.” Its patch summary and the bundled progression data both describe Lucky affecting Gilded drops.

There are 13 biomes from Verdant Woods to The Convergence, plus the special Elemental Conflux area.

The Convergence starts with four seats and expands to six. Wild seats give +25% drops and are the only seats that spawn elites. The automatic tier rises every 200 kills and falls by five on death. Scaling formulas depend on tier. The Lattice has 37 nodes, a limit of two Keystones and three loadouts.

The Guild Skill Tree grants one point per guild level and two per level after 68. Spend 15 points to unlock ranks 4–6 and 35 points to unlock ranks 7–10. Ascension follows level 68. A reset costs 1,000 Guild Arcstone.

## 3. Patch 1.3.1 changes that affect builds

| Area | Changes recorded in the snapshot |
| --- | --- |
| Equipment and activities | New Forge, Gear Score, sockets, gems, Rift Raids, Convergence, Guild Skill Tree and Arc Pass. Gear additions included a dedicated Torch slot, Greatsword, Crossbow and Grand Staff as two-handed weapons, Rogue claws and 12 alternative armor families. |
| Defense and healing | Retaliation replaced Thorns. Bulwark sets Dodge to 0%. Bloodthirst introduced the `% Life on Hit & Life on Kill` stat and a Torch-only affix. |
| Lucky Tier and Harmony | Lucky and Black Market share a pool. From ML 260, Lucky affects Gilded items. Harmony scales more strongly after ML 180. |
| Pets and talismans | New pet compounding curves and caps. Talisman inscriptions now synchronize. |
| Classes | Iron Constitution, Battle Recovery and Crushing Blows now grant Defense. Counterstrike replaced Victory Rush. Rogue critical strike and Double Hit skills received small reductions. |
| Tower, progression and drops | Tower enemies hit harder. From Murky Depths, ML progress varies by monster (+10% or −10%). A +40% Item Drop bonus at ML 1 fades by ML 41. Item Drop has diminishing returns above +300%. |

## 4. Where the app implements these rules

| File | Contents |
| --- | --- |
| `src/data/classes.js` | Five classes, 90 skills, per-point values, caps, tier requirements and point rules. |
| `src/data/items.js` | All 40 Item Codex families, with class, slot, one- or two-handed use, drop conditions, T1–T6 and A1 names, implicits and compatible prefixes and suffixes. Also covers rarities, multipliers, affixes, T2–T9 Drop Bonuses, categories by slot, gem families, secondary stats, socket unlocks and levels, and gem and item drops by ML. |
| `src/data/systems.js` | Stats, formulas, attributes, stances, Mastery, pets, talismans, runes, Guild Skill Tree, progression, Convergence, activities and class changes. |
| `src/data/builds.js` | Stances, stat priorities, and skill weights by class and goal. `goalGearRules` assigns families and alternatives to ten standard slot types. Profiles also set gem families, priority secondary stats, target Drop Bonuses, `STAT_TO_AFFIX`, talismans, pets and build notes. |
| `src/core/calc.js` | Excess critical chance, full 100% increments of DH and DD, DR caps, Retaliation, gems, Mastery and pet compounding. |
| `src/core/planner.js` | Allocates points across three branches. With enough points it gives one to each, divides the rest by goal weights and helps stronger branches reach Tier 2 or 3. It calculates effective ranks and caps from `+All Class Skills` through `skillBonuses`, `cappedByPlus` and `gained`. It validates manual ranks, tiers and prerequisites, builds gear and gem plans with `buildGearPlan` and `buildGemPlan`, and imports or exports build codes. |

## 4.1. Character level and Monster Level

| Input | What it controls | Where to enter it |
| --- | --- | --- |
| Character level | Class skill points. Gain one at level 1, then one every three levels. | Levels page (step 2), left panel |
| Monster Level (ML) | Item drop tier, implicit ranges, gem rarity, socket count, slot and family unlocks. ML 25 adds two-handed weapon drops, claws and alternative gear. ML 50 adds Torch. T7–T9 Drop Bonuses become relevant from ML 260. | Levels page (step 2), right panel |

The planner API is `planBuild({ classId, level, ml, goal, … })`. The `level` parameter means character level. The `ml` parameter means Monster Level. When an older build code omits ML, the planner uses `ml = level`. The derived values come from `dropTierAtMl(ml)`, `gemRarityAtMl(ml)`, `socketsAtMl(ml)` and `nextPointLevel(level)`.

## 5. Limitations and manual checks

1. On October 4, 2026, the researchers compared all five classes with the official class page and the September 29, 2026 Companion build. The class page supplied tiers, maximum ranks and unlock rules. Companion supplied `data/skill_tree_data.json`. The Druid has two skills per tier in each branch. Gnaw, Digger and Kinship take ten points each. The other Druid skills take five. The smoke test compares the branch, tier and maximum rank of all 90 skills against the bundled reference. Search the tests for `навыки: ветка, тир и макс. ранг каждого из 90 навыков совпадают с игрой`. [Official class page](https://idlearc.com/classes)
2. The 1.3.1 notes and build data give Counterstrike +2% Retaliation per point on blocked hits, capped at 25%. Iron Constitution gives +2% Defense per point. Battle Recovery gives +50 Defense and +8 Life on Kill per point. Crushing Blows gives +3% Critical Damage and +2% Defense per point. The revised Rogue critical strike and Double Hit skill values are 3%, 5% and 3% per point. The patch also brought the classes' farming skills closer together.
3. The build data supplies the effect limits in the table below.
4. The game does not publish the full order of damage calculations. The calculator estimates damage to compare builds.
5. Patches can change gems, pets and talismans before the wiki updates. Compare seasonal values with the [official patch notes](https://idlearc.com/patch-notes).

| Effect | Limit in the snapshot |
| --- | --- |
| Execution threshold | 35% |
| Titanic Blow | 80% |
| Relentless Assault | 100% |
| Deflection | 25% Block, 40% Retaliation |
| Perfect Shot | 60% |
| Trap damage | 35% |
| Hunter's Instinct | 15% |
| Magic Blast | 100% |
| Arcane Cascade | 100% |
| Pyroclasm | 100% |
| Shadow Echo | 100% trigger chance, 80% damage |
| Umbral Cascade | 75% |
| Lucky Hands | 15% |
| Lucky Tier | 20% |
| Kinship and Feral Bond conversion | 75% combined |
| Wild Attunement | 25% |
| Pet Egg drops | 15% |
| Pet EXP | 15% |

## 6. How to update the data

1. Read the latest [official patch notes](https://idlearc.com/patch-notes).
2. Compare values with the wiki pages `Item_Codex`, `Item_Codex/Affixes`, `Item_Codex/Drop_Bonuses`, `Gems`, `Pets`, `Talismans`, `Stats`, `Monster Level`, `Convergence` and `Guild Skill Tree`.
3. Update the corresponding objects in `src/data/*.js` and the date in `DATA_META.verified`. Each data file identifies its sources in the header.
4. Run `node tests/smoke.mjs`.
5. Start the local server with `PORT=5173 node server.js`. For the HTTP test and Windows commands, see the [English README](../README.en.md#tests).

## Passive tree (added October 5, 2026)

All classes share the passive tree. You gain one passive point per character level. Resets are free, and you can keep presets. The rules came from the IdleArc Wiki pages *New Player Guide* and *Skills (Tab)*.

The `passive` section of Companion's `skill_tree_data.json` supplied the structure and node values. Its `config_version` was `2026-09-29-003`. The researchers checked the data on October 2, 2026. There are 20 tiers with ten rows each, for 200 rows total. The value `unlock_threshold: 20` sets the points required in one tier to open the next. Every tenth row offers milestone nodes that cost one point each.

The tier 17 values matched the independent `fytchx/IdleArc-Skill-Calculator` reference (`data/passive-tree.js`, `reference-1`). Strength, Dexterity and Intelligence each gave +5 × 4. Attack Damage gave +507 × 5 and Pet Damage gave +355 × 4. Critical Chance gave +1% × 2 and Dodge gave +0.6% × 2.

The Passive Tree tab flags two open questions. How do rows unlock within a tier? Can a player take more than one of the three nodes in a milestone row?

## Item artwork sources (updated October 5, 2026)

The Item Codex lists icon paths as `static/images/items/<name>.webp`. The primary source is the Companion host, `idlearc-companion-web-production.up.railway.app`. During the October research, the fallback at `idlearc.com/static/images/items/` returned HTTP 403 or 404.

The server downloader added browser headers because Cloudflare returned HTTP 403 to plain Node fetch requests. It also used `dns.setDefaultResultOrder('ipv4first')` for the `fetch failed` error on Windows machines without an IPv6 route. The downloader retries requests and reports the cause from `error.cause`.

If the server lacks internet access, as in a sandbox preview, the download button automatically switches to the browser. The browser downloads the files and sends them to `POST /api/art/upload`. For the download controls and icon index, see the [item artwork guide](../assets/items/README.en.md).
