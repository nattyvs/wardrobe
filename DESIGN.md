---
name: Wardrobe
description: A daily fashion spread for one wardrobe, clothes on white paper, sand for notes, charcoal ink and a single pink signal.
colors:
  signal-pink: "#B3005E"
  wine-ink: "#5A1A2B"
  on-signal: "#FFFFFF"
  white-paper: "#FBFBFA"
  sand-panel: "#ECE8E1"
  charcoal-ink: "#2A2826"
  stone-ink: "#5A564F"
  stone-rule: "#D3CCC1"
typography:
  display:
    fontFamily: "\"W Didot\", Didot, \"Bodoni 72\", \"Bodoni MT\", serif"
    fontSize: "clamp(92px, 31vw, 128px)"
    fontWeight: 400
    lineHeight: 0.86
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "\"W Didot\", Didot, \"Bodoni 72\", \"Bodoni MT\", serif"
    fontSize: "44px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.06em"
  title:
    fontFamily: "\"W Didot\", Didot, \"Bodoni 72\", \"Bodoni MT\", serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "normal"
  section-cap:
    fontFamily: "\"W Didot\", Didot, \"Bodoni 72\", \"Bodoni MT\", serif"
    fontSize: "11.5px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.2em"
  body:
    fontFamily: "\"W Jost\", Futura, \"Avenir Next\", \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 300
    lineHeight: 1.5
    letterSpacing: "normal"
  caption:
    fontFamily: "\"W Jost\", Futura, \"Avenir Next\", \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "12.5px"
    fontWeight: 300
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "\"W Jost\", Futura, \"Avenir Next\", \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.22em"
rounded:
  none: "0px"
spacing:
  gutter: "18px"
  row: "10px"
  block: "22px"
  panel: "26px"
components:
  button-primary:
    backgroundColor: "{colors.charcoal-ink}"
    textColor: "{colors.white-paper}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "14px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "14px 16px"
  button-ghost-hover:
    backgroundColor: "{colors.charcoal-ink}"
    textColor: "{colors.white-paper}"
  button-disabled:
    backgroundColor: "transparent"
    textColor: "{colors.stone-ink}"
  tag-occasion:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal-ink}"
    rounded: "{rounded.none}"
    padding: "5px 7px"
  tag-customer:
    backgroundColor: "{colors.signal-pink}"
    textColor: "{colors.on-signal}"
    rounded: "{rounded.none}"
    padding: "5px 7px"
  panel-look:
    backgroundColor: "{colors.sand-panel}"
    rounded: "{rounded.none}"
    padding: "22px 18px 26px"
  input-underline:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "8px 0"
  tab-bar:
    backgroundColor: "{colors.white-paper}"
    textColor: "{colors.stone-ink}"
    typography: "{typography.label}"
    height: "54px"
  sheet:
    backgroundColor: "{colors.sand-panel}"
    rounded: "{rounded.none}"
---

# Design System: Wardrobe

## Overview

**Creative North Star: "The Quiet Signals Spread"**

Every screen is a page from a fashion editorial: the clothes sit on white paper, and warm sand is kept for the notes around them. The day's outfit is the story, laid out as technical flats with numbered notes, set in a high-contrast Didot that is allowed to run oversized and crop off the edge of the page. Everything else, controls, captions and data, is set small in Jost, tracked and quiet. Structure comes from hairline rules, never from boxes, cards or shadows.

The palette is near-neutral by design: white, sand and charcoal carry almost the whole surface, and the colour on screen comes from the garments themselves. One pink exists, and it is a signal. When pink appears the app is telling her something: a customer day, a piece that has not been worn, today in the week. That scarcity is what makes it readable at 7am.

The theme is light only, by decision: this is a morning dressing scene. Density is calm and single-column, sized for one hand on a phone. Motion is limited to one authored moment, the spread settling into place, plus quiet sheet and toast transitions.

**Key Characteristics:**
- Oversized Didot day name cropped off the left edge, tracked Didot caps for section names.
- Garments drawn as technical flats: tinted fill, hairline charcoal outline, faint construction lines.
- Numbered notes (01, 02...) tie the flat-lay to the credits and The Look.
- Hairline rules for every division; sand panels for the look notes; no cards, no shadows, no radius.
- Pink is a signal only, never decoration and never a control colour.

## Colors

A warm stone neutral system with charcoal ink and one saturated signal.

### Primary
- **Signal Pink** (`signal-pink`): Marks state the app wants noticed. Customer-day tag fill, the number and status line of a neglected or "fresh" piece, today's date in the week strip and Week list, the customer-day dot under a strip day, the closet lede's unworn count, the weather-adjustment note, input focus underline, text selection and caret. White text on pink (`on-signal`) only on the customer tag.

- **Wine Ink** (`wine-ink`): The weekday name on a day, and nothing else. Added 19 Oct 2026 when Natalia chose the board layout for Today (a big wine day name over the collage on white). It ties the top of the page to the clothes without competing with them. It is not a signal and never marks state; pink keeps that job.

### Neutral
- **White Paper** (`white-paper`): The ground wherever clothes are shown: the Today spread, Week, Closet, the piece image in sheets, the tab bar, and the text colour on ink-filled buttons. Natalia chose white for clothes (19 Oct 2026), as in direction one.
- **Sand Panel** (`sand-panel`): Kept for supporting surfaces only: The Look and Colour and Fabric panels, and bottom sheet bodies. From the Quiet Signals reference. The only change of surface in the system.
- **Charcoal Ink** (`charcoal-ink`): All primary text, garment outlines and seams, primary button fill, strong hairline rules (panel tops, the week strip rule, tab bar border, under section heads), focus outline.
- **Stone Ink** (`stone-ink`): Secondary text: captions, fabric compositions, inactive tabs and filters, disabled buttons.
- **Stone Rule** (`stone-rule`): Soft hairlines between list rows, the sample-data note borders, the "day off" tag border, the desktop column edges, link underlines at rest.

### Named Rules
**The Signal Rule.** Pink means "this needs your attention" and nothing else. If an element is pink, it must be a customer day, a neglected piece, today, an adjustment, or active input. Never a button fill, never a decorative accent, never an illustration colour.

**The Garments Are the Colour Rule.** Chrome stays white, sand and charcoal so the clothes carry the colour of each screen. Clothes always sit on white. The one exception is the weekday name, set in wine ink.

## Typography

**Display Font:** GFS Didot, self-hosted as "W Didot" (with Didot, Bodoni 72, Bodoni MT, serif)
**Body Font:** Jost variable 300 to 600, roman and italic, self-hosted as "W Jost" (with Futura, Avenir Next, Helvetica Neue, Arial)

**Character:** A fashion-magazine Didot for anything that is read as editorial (day names, piece names, reasons, temperatures, numbers) against a clean geometric Jost for anything that is operated or measured (buttons, tabs, tags, captions, compositions).

### Hierarchy
- **Display** (Didot 400, clamp(92px, 31vw, 128px), line-height 0.86, -0.04em, wine ink): The day name on Today, set on the left gutter with its serif fully visible, never cropped. One per screen.
- **Headline** (Didot 400, 44px, line-height 1, 0.06em, uppercase): Page titles on Week, Closet, Log and Settings.
- **Numerals** (Didot 400, 40 to 46px): The temperature on Today (46px) and day names in the Week list (40px, -0.03em). Tabular numerals in the week strip (19px).
- **Title** (Didot 400, 19 to 20px, line-height 1.25 to 1.3): The one-sentence reason, page ledes, plan notes. Editorial sentences, max about 30ch.
- **Item name** (Didot 400, 15 to 17px): Tappable piece names in credits, log picklists, swaps and toggles.
- **Section cap** (Didot 400, 11 to 15px, 0.16 to 0.3em, uppercase): Section names ("The look", "Colour and fabric"), the date under the day name, forecast caption, piece titles in notes and the closet grid. The masthead wordmark is the widest tracking (0.42em).
- **Body** (Jost 300, 15px, line-height 1.5): Running copy and form input (16px in fields to stop iOS zoom).
- **Caption** (Jost 300, 11 to 13.5px, stone ink): Compositions, wear counts, hints, credit-line fabrics.
- **Label** (Jost 500, 11px, 0.14 to 0.22em, uppercase): Buttons, tags, tabs, filters, the city link.

### Named Rules
**The Two Voices Rule.** Didot speaks, Jost operates. Anything read as editorial content is Didot at any size, including tappable piece names and the feel words; action labels, tags, tabs, captions and data are Jost. Didot is used at weight 400 only.

**The Tracked Caps Rule.** Every uppercase setting is tracked (at least 0.06em on headlines, 0.14em and up on labels and caps). Never set untracked caps.

## Layout

A single phone column, max 480px, centred; above 600px the column gets stone hairlines on both sides and the white ground continues beyond. Side gutters are 18px or the safe-area inset, whichever is larger. A fixed text tab bar (54px plus safe-area) sits at the bottom; content pads to clear it.

Today is composed as a spread: the hero is a fixed-height field with absolutely positioned layers: the day name top-left, cropped and in wine ink, the date beneath, the temperature block top-right at 29% width behind a charcoal hairline, and below the date a stage (clamp(340px, 95vw, 410px) tall, with room under it so long trousers are not cut) where garment photos overlap as an asymmetric flat-lay with numbered labels. A bottom piece carries its number under the hem so it does not sit on the outer layer. Below the hero: the occasion tag, the reason, actions, then the seven-column week strip. The numbered names live in The Look panel and open on tap from the stage; there is no separate credit line.

Rhythm is built on list rows of 10 to 14px vertical padding separated by hairlines, 18 to 22px between blocks, and 22px/26px panel padding. Grids are explicit and quiet: notes rows of 28px number, 56px flat, text; closet three columns with 18px/14px gaps and 4:5 drawing cells; fabric swatches auto-fill at 132px minimum.

## Elevation & Depth

Flat. There are no shadows anywhere. Depth is conveyed by paper changes (white to sand panel), by charcoal versus stone hairlines, and by overlap within the flat-lay. Bottom sheets rise over a dim scrim (`rgba(18,18,18,.32)`) and are marked by a charcoal top rule, not a shadow.

### Named Rules
**The Paper Not Plastic Rule.** Separate things with a rule or a change of paper. If something seems to need a shadow, it needs a hairline.

## Shapes

Square everything: buttons, tags, inputs, checkboxes, switches (including the switch thumb), sheets and swatches have 0 radius. Borders are 1px hairlines; the only weight changes are charcoal (structure, active state) versus stone (row dividers, resting state). Active states in text navigation are a 1px charcoal underline, not a fill or pill.

The one round form is the 5px customer-day dot under the week strip, a signal mark, not a container. Garment flats are the system's other silhouette: hand-drawn path outlines with round joins, non-scaling 1.1 strokes and 0.8 seams at 55% opacity.

## Components

### Buttons
Tight, tracked and square; they read like the small print in a magazine.
- **Shape:** square corners (0), 1px charcoal border.
- **Primary:** charcoal fill, white text, Jost 500 11px at 0.2em uppercase, 14px by 16px padding. Used once per action row ("Wear this", "Save the log").
- **Ghost:** transparent with charcoal border and text; on hover it fills charcoal. Secondary actions ("Swap a piece", "Back").
- **Disabled:** transparent, stone text, stone border ("Worn today").
- **Text link action:** uppercase tracked label with a 4px-offset underline ("Close", "Add a photo").
- **Focus:** 2px charcoal outline at 3px offset, globally. Every control has at least a 44px hit area: small text controls keep their size and take an invisible centred hit area.

### Tags
- **Occasion tag:** Jost 500 11px, 0.22em uppercase, 5px by 7px, 1px charcoal border, no fill ("Office day"). Tappable to change the occasion.
- **Customer day:** pink fill and border, white text. The pink is the customer-day signal, not a control style.
- **Day off:** stone border, stone text.

### Cards / Containers
- No cards. Content sits on the white ground divided by hairlines.
- **Look panel:** full-bleed sand, charcoal top rule, 22px top and 26px bottom padding; a stacked panel takes a stone top rule instead.
- **Plan note:** Didot 17px sentence between two charcoal rules.

### Inputs / Fields
- **Style:** underline only, 1px charcoal bottom border, transparent ground, Jost 300 16px, no radius. Labels above as section caps.
- **Focus:** the underline turns pink and doubles to 2px, so the change reads without colour. Placeholder text is #68635B, 4.5:1 or better on paper and sand.
- **Checkbox:** 22px charcoal square, filled charcoal with a white tick when checked.
- **Switch:** 42 by 24px square track with a square 16px thumb. Off is a hollow thumb on a paper track; on is a charcoal track, a filled white thumb and a small white tick, so the states differ without colour or position alone.
- **Feel selector:** a segmented row of Didot words inside a charcoal frame, divided by charcoal rules; the pressed segment fills charcoal.

### Navigation
- **Masthead:** "WARDROBE" in Didot 12px at 0.42em left; the city as an underlined Jost label right.
- **Back link:** on a day page other than today, the masthead shows a chevron and "Week" in place of the Wardrobe word, 44px high, returning to the Week page.
- **Tab bar:** fixed, white ground, charcoal top rule, five tabs (Today, Week, Closet, Style, Log), each a 22px line icon above an 11px label. Icons are 1.3px strokes in currentColor (sun, calendar, hanger, four-point star, circled tick), 1.6px when active. Inactive stone, active charcoal with a 1px underline on the label. Trips is not a tab: it is a text link at the top right of the Week page.
- **Filters and segments:** horizontal scrolling text labels; pressed state is charcoal with an underline, the count in Didot.

### Garment Flat (signature)
Every piece without a photo is drawn as a technical flat: its own colour as fill, charcoal outline, faint seams. Flats are labelled with Didot numbers (01, 02...) in the flat-lay; the hero piece being revived takes a pink number. Photo cut-outs replace flats on the same slots when her photos arrive.

### Numbered Notes (signature)
The Look lists each piece as a row: Didot number, small flat, piece name in tracked Didot caps, composition in a stone caption. A neglected piece turns its number and caption pink and states how long since it was worn.

### Week Strip
Seven columns under a charcoal rule: Jost day label, Didot temperature, and a 5px pink dot on customer days. Today's temperature is pink and its label underlined.

### Repeat Mark (the one icon)
A small circular-arrow glyph at the corner of a closet tile, in the piece sheet and beside a piece in the Look. It says "I've been wearing this a lot". Charcoal outline when off, charcoal fill when on, never pink. It is the single icon in the app: a word would not fit a 3-column tile, and the gesture is a tap with no log entry behind it. Tab bar and buttons stay text.

### Status Segments
In the piece sheet, availability is a row of tracked Jost labels inside a charcoal frame, same construction as the Feel selector, wrapping to a second row on narrow screens. A piece that is not available keeps its tile, dimmed, and the status replaces the wear caption underneath. No badge.

### Trips
- **Trip strip (Week):** one hairline-bound line above the seven days. Didot name and dates, a stone count of things to fix. A trip is not a signal, so it stays charcoal.
- **Packing list:** rows grouped under Didot section caps, each with a small flat or photo, a Didot name, a stone "Works in 4 of 6 looks" caption and a square checkbox.
- **Weather row:** a column per day with tracked Jost day label, Didot temperature and a stone date. A temperature taken from past years is marked with a "~" and the caption says so.
- **Gaps panel:** the one place pink is used for an alert in the trip flow. Pink rule on top, plain sentences underneath ("Rain on Mon 26 and nothing packed will cope"). Hidden when there are no gaps.
- **What I'm taking:** the primary button on the packing section opens a sheet of the whole closet to tick. Ticked pieces are hers: the suggestion keeps them and builds around them, and their caption starts "You are taking this". A trip is suggested automatically when it is saved.
- **Also taking:** things not in the closet (swimsuit, a gift) as plain Didot rows with Remove, and one underline input with Add. They are listed only; the app does not dress them.
- **Forms:** the same underline inputs as Settings. Deleting a trip takes two taps; the first turns the label into "Tap again to delete".

### Reactions and Rules
After a day is logged, reactions are a wrapping row of square toggles in tracked Jost, charcoal when pressed. A learned rule sits on the piece sheet as a sentence on a stone-ruled row with a text "Undo" action. Sand is not used.

### Face Note
A one-sentence stone caption under the Look, no rule or fill, shown only when a dark or cool piece sits at the face and the look already carries a warm accent. It never asks for one.

### Try On Hand-off
A sheet, opened from "Try it on in ChatGPT" under The look on Today and under each day on Week. It holds three numbered steps, a flat-lay image of the day's pieces (built on the phone, pieces laid apart on a paper-toned ground, no labels), Copy / Save / Share buttons, and the prompt in an editable box with Copy prompt and Open ChatGPT. Nothing is sent from the app. Her own photo is never stored here.

### Office Days Picker
Top of Week: "Office days" with a This week / Next week switch, then five day chips (Mon to Fri), outlined in stone ink and filled charcoal when she is in the office. Every day starts as a day off. Until two office days are picked, the week shows the remaining office looks (numbered 01, 02, "Dressed for 12°") under "Office looks to keep in mind", built for the weather of the days still open. Picking a day, including a third one, puts a real office look on it. The tag on a day's page cycles Office, Customer, Day off. The Try on links on Week are 44px tall hit areas with a short label.

### Sheet
Bottom sheet on sand with the piece image on white, charcoal top rule, sticky bar with a section cap title and a text "Close", sliding up over a scrim with the house ease.

### Long lists
**Long lists.** Anything that grows uses one of three shared patterns, never a bespoke one. *Fold*: a section that opens on tap; the summary row is the section cap, a Didot count, a stone one-line summary and a tracked "Show"/"Hide" text action, no chevron. It remembers open or closed on the phone. A closed sand panel shrinks to its summary row. *Reveal*: the first few items, then a stone "6 of 14" caption and a "Show 6 more" text action on a stone hairline; once all are shown it offers "Show fewer". Page sizes: 6 for tall two-column cards, 8 for images and rules, 12 for the four-column grid, 14 log days, 5 rows in Get more. *Filter row*: the same horizontal text labels as the Closet type bar, with Didot counts, shown only when a list passes one page. Month subheads in the Log are section caps over a charcoal rule. New items are counted in charcoal, never pink. The Closet is the exception: it shows everything, and its type bar and search do the narrowing.

## Do's and Don'ts

### Do:
- **Do** keep pink to signals: customer days, neglected pieces, today, weather adjustments, active input, and the trip gaps panel.
- **Do** separate content with 1px hairlines: charcoal for structure, stone for rows.
- **Do** set editorial content in Didot 400 and controls and data in tracked Jost.
- **Do** keep every control square (0 radius), including switch thumbs and checkboxes.
- **Do** number the pieces of a look 01 onward and carry the same numbers across flat-lay, credits and notes.
- **Do** let the day name run oversized and crop off the page edge on Today.
- **Do** give any list that can grow a fold, a reveal or a filter row (see Long lists); never let a page grow without end.
- **Do** use the house ease `cubic-bezier(.16,1,.3,1)` and honour reduced motion.

### Don't:
- **Don't** fill a button or any other control with pink.
- **Don't** use cards, drop shadows or rounded corners; the customer-day dot is the only round mark.
- **Don't** add icons to buttons or add a sixth tab. Icons belong to the tab bar and the Repeat Mark only. Trips lives on the Week page.
- **Don't** put clothes on sand, grey or any tinted ground; clothes sit on white. Don't add a dark theme.
- **Don't** set uppercase without tracking, or set action buttons, tags or tabs in Didot.
