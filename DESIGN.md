---
name: Wardrobe
description: A daily fashion spread for one wardrobe, on warm sand with charcoal ink and a single pink signal.
colors:
  signal-pink: "#B3005E"
  on-signal: "#FFFFFF"
  sand-paper: "#ECE8E1"
  ivory-panel: "#FAF8F4"
  charcoal-ink: "#2A2826"
  stone-ink: "#5A564F"
  stone-rule: "#D3CCC1"
typography:
  display:
    fontFamily: "\"W Didot\", Didot, \"Bodoni 72\", \"Bodoni MT\", serif"
    fontSize: "clamp(96px, 29vw, 128px)"
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
    textColor: "{colors.sand-paper}"
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
    textColor: "{colors.sand-paper}"
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
    backgroundColor: "{colors.ivory-panel}"
    rounded: "{rounded.none}"
    padding: "22px 18px 26px"
  input-underline:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "8px 0"
  tab-bar:
    backgroundColor: "{colors.sand-paper}"
    textColor: "{colors.stone-ink}"
    typography: "{typography.label}"
    height: "54px"
  sheet:
    backgroundColor: "{colors.ivory-panel}"
    rounded: "{rounded.none}"
---

# Design System: Wardrobe

## Overview

**Creative North Star: "The Quiet Signals Spread"**

Every screen is a page from a fashion editorial printed on warm sand stock. The day's outfit is the story, laid out as technical flats with numbered notes, set in a high-contrast Didot that is allowed to run oversized and crop off the edge of the page. Everything else, controls, captions and data, is set small in Jost, tracked and quiet. Structure comes from hairline rules, never from boxes, cards or shadows.

The palette is near-neutral by design: sand, ivory and charcoal carry almost the whole surface, and the colour on screen comes from the garments themselves. One pink exists, and it is a signal. When pink appears the app is telling her something: a customer day, a piece that has not been worn, today in the week. That scarcity is what makes it readable at 7am.

The theme is light only, by decision: this is a morning dressing scene. Density is calm and single-column, sized for one hand on a phone. Motion is limited to one authored moment, the spread settling into place, plus quiet sheet and toast transitions.

**Key Characteristics:**
- Oversized Didot day name cropped off the left edge, tracked Didot caps for section names.
- Garments drawn as technical flats: tinted fill, hairline charcoal outline, faint construction lines.
- Numbered notes (01, 02...) tie the flat-lay to the credits and The Look.
- Hairline rules for every division; ivory panels for the look notes; no cards, no shadows, no radius.
- Pink is a signal only, never decoration and never a control colour.

## Colors

A warm stone neutral system with charcoal ink and one saturated signal.

### Primary
- **Signal Pink** (`signal-pink`): Marks state the app wants noticed. Customer-day tag fill, the number and status line of a neglected or "fresh" piece, today's date in the week strip and Week list, the customer-day dot under a strip day, the closet lede's unworn count, the weather-adjustment note, input focus underline, text selection and caret. White text on pink (`on-signal`) only on the customer tag.

### Neutral
- **Sand Paper** (`sand-paper`): The page ground everywhere, the tab bar ground, and the text colour on ink-filled buttons. User-pinned from the Quiet Signals reference; do not "correct" it towards white or grey.
- **Ivory Panel** (`ivory-panel`): Raised paper for The Look and Colour and Fabric panels, and for bottom sheets. The only change of surface in the system.
- **Charcoal Ink** (`charcoal-ink`): All primary text, garment outlines and seams, primary button fill, strong hairline rules (panel tops, the week strip rule, tab bar border, under section heads), focus outline.
- **Stone Ink** (`stone-ink`): Secondary text: captions, fabric compositions, inactive tabs and filters, disabled buttons.
- **Stone Rule** (`stone-rule`): Soft hairlines between list rows, the sample-data note borders, the "day off" tag border, the desktop column edges, link underlines at rest.

### Named Rules
**The Signal Rule.** Pink means "this needs your attention" and nothing else. If an element is pink, it must be a customer day, a neglected piece, today, an adjustment, or active input. Never a button fill, never a decorative accent, never an illustration colour.

**The Garments Are the Colour Rule.** Chrome stays sand, ivory and charcoal so the clothes carry the colour of each screen.

## Typography

**Display Font:** GFS Didot, self-hosted as "W Didot" (with Didot, Bodoni 72, Bodoni MT, serif)
**Body Font:** Jost variable 300 to 600, roman and italic, self-hosted as "W Jost" (with Futura, Avenir Next, Helvetica Neue, Arial)

**Character:** A fashion-magazine Didot for anything that is read as editorial (day names, piece names, reasons, temperatures, numbers) against a clean geometric Jost for anything that is operated or measured (buttons, tabs, tags, captions, compositions).

### Hierarchy
- **Display** (Didot 400, clamp(96px, 29vw, 128px), line-height 0.86, -0.04em): The day name on Today, deliberately cropped off the left edge. One per screen.
- **Headline** (Didot 400, 44px, line-height 1, 0.06em, uppercase): Page titles on Week, Closet, Log and Settings.
- **Numerals** (Didot 400, 40 to 46px): The temperature on Today (46px) and day names in the Week list (40px, -0.03em). Tabular numerals in the week strip (19px).
- **Title** (Didot 400, 19 to 20px, line-height 1.25 to 1.3): The one-sentence reason, page ledes, plan notes. Editorial sentences, max about 30ch.
- **Item name** (Didot 400, 15 to 17px): Tappable piece names in credits, log picklists, swaps and toggles.
- **Section cap** (Didot 400, 11 to 15px, 0.16 to 0.3em, uppercase): Section names ("The look", "Colour and fabric"), the date under the day name, forecast caption, piece titles in notes and the closet grid. The masthead wordmark is the widest tracking (0.42em).
- **Body** (Jost 300, 15px, line-height 1.5): Running copy and form input (16px in fields to stop iOS zoom).
- **Caption** (Jost 300, 11 to 13.5px, stone ink): Compositions, wear counts, hints, credit-line fabrics.
- **Label** (Jost 500, 9.5 to 11px, 0.14 to 0.22em, uppercase): Buttons, tags, tabs, filters, the city link.

### Named Rules
**The Two Voices Rule.** Didot speaks, Jost operates. Anything read as editorial content is Didot at any size, including tappable piece names and the feel words; action labels, tags, tabs, captions and data are Jost. Didot is used at weight 400 only.

**The Tracked Caps Rule.** Every uppercase setting is tracked (at least 0.06em on headlines, 0.14em and up on labels and caps). Never set untracked caps.

## Layout

A single phone column, max 480px, centred; above 600px the column gets stone hairlines on both sides and the sand ground continues beyond. Side gutters are 18px or the safe-area inset, whichever is larger. A fixed text tab bar (54px plus safe-area) sits at the bottom; content pads to clear it.

Today is composed as a spread: the hero is a fixed-height stage (clamp(340px, 95vw, 410px)) with absolutely positioned layers: day name top-left cropped, date beneath, temperature block top-right at 29% width behind a charcoal hairline, and garment flats overlapping as an asymmetric flat-lay with numbered labels. Below it, the credits stack (occasion tag, numbered credit line, reason), actions, then the seven-column week strip.

Rhythm is built on list rows of 10 to 14px vertical padding separated by hairlines, 18 to 22px between blocks, and 22px/26px panel padding. Grids are explicit and quiet: notes rows of 28px number, 56px flat, text; closet three columns with 18px/14px gaps and 4:5 drawing cells; fabric swatches auto-fill at 132px minimum.

## Elevation & Depth

Flat. There are no shadows anywhere. Depth is conveyed by paper changes (sand to ivory panel), by charcoal versus stone hairlines, and by overlap within the flat-lay. Bottom sheets rise over a dim scrim (`rgba(18,18,18,.32)`) and are marked by a charcoal top rule, not a shadow.

### Named Rules
**The Paper Not Plastic Rule.** Separate things with a rule or a change of paper. If something seems to need a shadow, it needs a hairline.

## Shapes

Square everything: buttons, tags, inputs, checkboxes, switches (including the switch thumb), sheets and swatches have 0 radius. Borders are 1px hairlines; the only weight changes are charcoal (structure, active state) versus stone (row dividers, resting state). Active states in text navigation are a 1px charcoal underline, not a fill or pill.

The one round form is the 5px customer-day dot under the week strip, a signal mark, not a container. Garment flats are the system's other silhouette: hand-drawn path outlines with round joins, non-scaling 1.1 strokes and 0.8 seams at 55% opacity.

## Components

### Buttons
Tight, tracked and square; they read like the small print in a magazine.
- **Shape:** square corners (0), 1px charcoal border.
- **Primary:** charcoal fill, sand text, Jost 500 10.5px at 0.22em uppercase, 14px by 16px padding. Used once per action row ("Wear this", "Save the log").
- **Ghost:** transparent with charcoal border and text; on hover it fills charcoal. Secondary actions ("Swap a piece", "Back").
- **Disabled:** transparent, stone text, stone border ("Worn today").
- **Text link action:** uppercase tracked label with a 4px-offset underline ("Close", "Add a photo").
- **Focus:** 2px charcoal outline at 3px offset, globally.

### Tags
- **Occasion tag:** Jost 500 10px, 0.22em uppercase, 5px by 7px, 1px charcoal border, no fill ("Office day"). Tappable to change the occasion.
- **Customer day:** pink fill and border, white text. The pink is the customer-day signal, not a control style.
- **Day off:** stone border, stone text.

### Cards / Containers
- No cards. Content sits on the sand ground divided by hairlines.
- **Look panel:** full-bleed ivory, charcoal top rule, 22px top and 26px bottom padding; a stacked panel takes a stone top rule instead.
- **Plan note:** Didot 17px sentence between two charcoal rules.

### Inputs / Fields
- **Style:** underline only, 1px charcoal bottom border, transparent ground, Jost 300 16px, no radius. Labels above as section caps.
- **Focus:** the underline turns pink; no outline.
- **Checkbox:** 22px charcoal square, filled charcoal with a sand tick when checked.
- **Switch:** 42 by 24px square track with a square 16px thumb; checked inverts to charcoal track and sand thumb.
- **Feel selector:** a segmented row of Didot words inside a charcoal frame, divided by charcoal rules; the pressed segment fills charcoal.

### Navigation
- **Masthead:** "WARDROBE" in Didot 12px at 0.42em left; the city as an underlined Jost label right.
- **Tab bar:** fixed, sand ground, charcoal top rule, four text labels (Today, Week, Closet, Log). Inactive stone, active charcoal with a 1px underline. No icons.
- **Filters and segments:** horizontal scrolling text labels; pressed state is charcoal with an underline, the count in Didot.

### Garment Flat (signature)
Every piece without a photo is drawn as a technical flat: its own colour as fill, charcoal outline, faint seams. Flats are labelled with Didot numbers (01, 02...) in the flat-lay; the hero piece being revived takes a pink number. Photo cut-outs replace flats on the same slots when her photos arrive.

### Numbered Notes (signature)
The Look lists each piece as a row: Didot number, small flat, piece name in tracked Didot caps, composition in a stone caption. A neglected piece turns its number and caption pink and states how long since it was worn.

### Week Strip
Seven columns under a charcoal rule: Jost day label, Didot temperature, and a 5px pink dot on customer days. Today's temperature is pink and its label underlined.

### Sheet
Bottom sheet on ivory, charcoal top rule, sticky bar with a section cap title and a text "Close", sliding up over a scrim with the house ease.

## Do's and Don'ts

### Do:
- **Do** keep pink to signals: customer days, neglected pieces, today, weather adjustments, active input.
- **Do** separate content with 1px hairlines: charcoal for structure, stone for rows.
- **Do** set editorial content in Didot 400 and controls and data in tracked Jost.
- **Do** keep every control square (0 radius), including switch thumbs and checkboxes.
- **Do** number the pieces of a look 01 onward and carry the same numbers across flat-lay, credits and notes.
- **Do** let the day name run oversized and crop off the page edge on Today.
- **Do** use the house ease `cubic-bezier(.16,1,.3,1)` and honour reduced motion.

### Don't:
- **Don't** fill a button or any other control with pink.
- **Don't** use cards, drop shadows or rounded corners; the customer-day dot is the only round mark.
- **Don't** add icons to the tab bar or buttons; navigation is text.
- **Don't** replace the sand ground with white or a cool grey, or add a dark theme.
- **Don't** set uppercase without tracking, or set action buttons, tags or tabs in Didot.
