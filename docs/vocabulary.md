# Vocabulary

Agreed terms for pages, views, and concepts. Use these consistently when discussing the app.

## Pages

| Term | Description |
|---|---|
| **Home page** | `/` — collection list with search, tags, Due tab |
| **Collection page** | `/collections/$id` — everything after tapping a collection |

## Views (within the Collection page)

| Term | Description |
|---|---|
| **Mode picker** | Default view on the collection page — "Practice All" / "Spaced Repetition" buttons |
| **Game** | The typing exercise (`?mode=normal` or `?mode=srs`) |
| **Progress view** | Per-card SRS breakdown (`?view=progress`) |
| **All done screen** | Shown when SRS mode is opened but no cards are due |

## Game Concepts

| Term | Description |
|---|---|
| **Collection** | A set of challenges with title, description, and tags |
| **Challenge** | A single question/answer pair |
| **Original** | The prompt shown above the input (English meaning or German context) |
| **Translation** | The German text the user types |

## Input Modes

| Term | Description |
|---|---|
| **Slot mode** | One box per character — default for most collections (`freeInput=false`) |
| **Free input mode** | Open text fields per gap, pre-filled context shown inline (`freeInput=true`) |

## Game States

| Term | Description |
|---|---|
| **Typing** | User is actively entering text |
| **Incorrect / Submitted** | Wrong answer — correct answer shown, 5s countdown |
| **Correct / Completed** | Right answer — interval pills (SRS mode) or 5s countdown (normal mode) |

## SRS-Specific

| Term | Description |
|---|---|
| **SRS session** | A review run using `?mode=srs` |
| **Interval pills** | The 1–9 buttons (ASAP → 2w) shown after a correct answer in SRS mode |
| **Due cards** | Cards whose review date has passed |
| **Retry phase** | After finishing a session, cards answered wrong are replayed |
