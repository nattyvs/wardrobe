# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person, the owner of the wardrobe. She opens the app on her phone in the morning while getting dressed, in the evening to log what she wore, and on Sunday to look at the week ahead. She works in an office two days a week on dates that change, sometimes meets customers, and wants those days dressed more smartly. She travels now and then, so a trip is a packing question, not a second wardrobe.

## Product Purpose

She owns many clothes she does not wear. The app puts unworn pieces back into rotation by planning a look for each day from what she already owns, tied to the weather and the kind of day, and by keeping a log of what she actually wore. Success: pieces that were never worn get worn, and an office or customer day stops being a scramble.

## Positioning

A planner and a mirror for one specific wardrobe. Looks come only from pieces she owns, every suggestion is grounded in her own wear history and reactions, and the plan is checked each week by Claude acting as stylist.

## Operating Context

- **Daily loop.** Morning: one look is ready to put on, adjusted for the day's forecast. Evening: she logs what she wore, by ticking pieces or adding a mirror photo.
- **Every day starts as a day off.** She marks the office days for the week (about two, varying), and may add an extra one in any week. Until she does, each week carries two office looks as suggestions. A customer day dresses a notch smarter.
- **The app plans on its own.** It builds the next two weeks in order, resting pieces between wears, so it works if nothing else runs.
- **Sunday check by Claude (intended, not built yet).** A weekly routine reviews the app's plan and corrects it.
- **Trying looks on.** Rendered images of her wearing a look are made outside the app, by hand in ChatGPT. The app prepares the flat-lay image and the prompt to copy. Nothing about her photo goes through the app.
- Season and temperature drive fabric and layering. Her taste includes plenty of black; any colour guidance is a light nudge, never a rule.

## Capabilities and Constraints

- Static HTML, CSS and vanilla JS, installable as a home-screen web app, hosted on GitHub Pages. No build step, no paid services.
- All personal data (closet catalogue, garment photos, wear log, plan, trips, style notes) lives in a separate private repository, read and written through the GitHub contents API with a token she pastes into Settings. Nothing personal belongs in this public repository.
- A labelled sample wardrobe shows until her own data is connected.
- Forecast from Open-Meteo, no key needed.
- Piece statuses (wash, dry cleaner, repair, away), on-repeat marks, reactions that become rules, trips with a packing suggestion, loved pieces and looks.
- Undecided: whether to add an AI image service for try-ons (decision deferred to avoid extra cost); who or what writes the Sunday correction.

## Brand Commitments

- Name: Wardrobe.
- Editorial and chic. Beautiful design matters to her. The app carries the look recorded in DESIGN.md.
- British English. Copy is short and direct, with no AI-tell vocabulary and no em dashes.

## Evidence on Hand

- Her closet is photographed and catalogued in the private repository. This repository holds only the sample wardrobe, drawn stand-ins and fonts.
- No wear history existed at launch. Taste signals come from what she logs and how she reacts, so until then the app must not claim to know her taste.

## Product Principles

- Wear what you own before anything else: pieces not worn lately come forward.
- Zero decisions at the door: the morning screen shows one look, ready.
- Grounded in her evidence: her wear history and reactions outrank generic style rules.
- Suggestions, not rules: black, favourites and palette notes nudge the choice and never decide it.
- Honest about uncertainty: blank fields stay blank, and the app says when it is guessing.

## Accessibility & Inclusion

Used one-handed on a phone, often in a hurry: touch targets are at least 44px, text stays legible at small sizes, and nothing relies on colour alone.
