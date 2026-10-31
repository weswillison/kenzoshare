# Design

Figma is the sketchpad. The code is the source of truth: `src/app/globals.css` holds the eight color variables, and `src/components/` holds the thirteen UI primitives. The Figma file mirrors them so a screen can be sketched from the real parts and brought back as a small, explicit change.

Figma file: **KenzoShare**, https://www.figma.com/design/8FO3cJnWDMDem2p5J72qJn (Wes's team drafts; share it from Figma when a second person needs it).

## Token layers

Tokens are Figma variables. Two ideas run through them:

- **Primitive vs. semantic.** A primitive is a raw value with no meaning (`gray/600 = #6b6b6b`). A semantic token names a job (`muted` = "secondary text") and points at a primitive. Components only ever use semantic tokens, so retheming is changing which primitive a semantic token points at, never touching a component.
- **Modes.** A semantic token has one value per mode. `Color` has Light and Dark, matching the `prefers-color-scheme` media query in `globals.css`. A screen frame picks its mode; everything inside follows.

| Collection | What it holds | Mirrors |
|---|---|---|
| `Primitives` | 15 raw colors, hidden from pickers, one mode | the hex values that appear in `globals.css` |
| `Color` | `bg fg muted line hover link on-link danger`, Light and Dark, each an alias to a primitive | the eight CSS variables, name for name; code syntax is `var(--bg)` etc. |
| `Layout` | `space/*`, `size/*`, `width/page`, `radius/*`, `stroke/1`, `opacity/disabled` | the Tailwind utilities the primitives use (`space/4` is `p-4`/`gap-4`), at the 17px root |
| `Type` | `font/family`, `weight/*`, `text/*`, `leading/*` | Atkinson Hyperlegible Next and Tailwind's `text-xs` to `text-xl` at the 17px root |

Text styles (`Body`, `Body medium`, `Small`, `Tiny`, `Large`, `Heading 1`, `Heading 2`) bind to the `Type` variables.

The root font size is 17px, so every rem-based Tailwind unit is scaled by 17/16: `p-4` is 17px, `text-sm` is 14.875px, `min-h-12` is 51px. The Figma values are the real rendered values, fractions included.

## Pages

- **Read me**: the rules below, in the file.
- **Components**: one component per primitive, named as in code (`Page`, `Section`, `Row`, `Muted`, `Empty`, `Field`, `Input`, `Textarea`, `Select`, `TextLink`, `Heading`, `ActionForm`, `Submit`). Variants and properties follow the props: `Submit` has `Style=Default|Quiet` and `State=Default|Disabled`, `Row` has `Link=No|Yes`, `Heading` has `Level=1|2` and `Open=No|Yes` for the info toggle. Children props are slots. Each component's description quotes the Tailwind classes it mirrors.
- **Screen parts**: markup the garage screens use that is not a primitive in code (`Header` from `layout.tsx`, `Chip`, `Fact`, `Expand`, `Thumb`, `Photo`, `Divider top`). This page is a to-do list: anything here that gets reused is a candidate for `src/components/`.
- **Screens**: `/garage` and `/garage/[id]` at phone width, Light and Dark.

## Rules

1. **Screens use only components and variables.** A screen is instances, transparent layout frames whose spacing binds to `Layout` variables, and text that uses a library text style and a `Color` variable. No raw hex, no hand-typed sizes. If a screen needs something new, add a component (under Screen parts if it is not a primitive in code) instead of drawing it inline.
2. **Every fill, stroke, radius, and spacing on a component binds to a variable.** A quick check in the file: select all on the Components page, nothing in the right panel should show a bare color.
3. **Code wins.** When a primitive's props or classes change in code, update the Figma component to match. Figma never drives component structure.

## Sync: Figma to `globals.css`, one direction, colors only

The only thing that flows from Figma back into code is the `Color` layer:

1. In Figma, change a primitive's hex, or re-point a semantic token at a different primitive, in both modes.
2. Copy the eight resolved Light values into the `:root` block and the eight Dark values into the media query in `src/app/globals.css`. Names match one to one.
3. Click through a screen in both modes.

Nothing else syncs. `Layout` and `Type` are derived from Tailwind defaults and the 17px root; to change them, change the code and then reconcile the Figma values by hand. There is no plugin or script doing any of this, on purpose: eight values is a diff a person can read.

## Not using Code Connect

Figma Code Connect links each Figma component to a code snippet so Dev Mode shows `<Submit quiet>` instead of a CSS dump, and it can be told which variant maps to which prop. For this project the descriptions on each component already name the file and classes. Code Connect would add an npm dependency (`@figma/code-connect`), a `.figma.tsx` file per component, a publish step that needs a Figma token, and it needs a paid Figma seat with Dev Mode to see the result. That is more moving parts than the site's values allow for a one-volunteer project. Revisit if someone other than Wes starts building from the file.

## Working on the file with an agent

Load the `figma:figma-use` and `figma:figma-generate-library` skills first. The file key is `8FO3cJnWDMDem2p5J72qJn`. Variables, components, and screens are found by name; nothing in this repo stores Figma node ids.

## Values the file had to invent

The code has no explicit scale for these, so the file guesses. Treat them as proposals, not facts:

- Primitive names (`gray/100` to `gray/950`, `warm/50`, `blue/300`, `blue/700`, `navy/900`, `red/300`, `red/700`): the numbers rank the hexes by lightness, loosely like Tailwind's scale. The hexes themselves are exact.
- `Photo` is 356 by 267 (4:3); real photos keep their own aspect ratio.
- The `Select` chevron and the `Expand` marker are hand-drawn stand-ins for what the browser draws.
- The gap between "$150" and "replacement cost" on the item page is `space/1`; in code it is a literal space.
- `Row` has a `Link=No, State=Hover` variant only because Figma needs the full matrix; the app has no such state.
- `Submit`'s `mt-5` and `Divider top`'s `mt-6` are margins in code; in Figma they are padding on the surrounding layout frame.
