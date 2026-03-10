# DE-003 Figma REST API Research

Cross-checked against Figma developer docs on 2026-03-10.

Sources:
- https://developers.figma.com/docs/rest-api/file-property-types/
- https://developers.figma.com/docs/rest-api/file-node-types/
- https://developers.figma.com/docs/rest-api/file-endpoints/
- https://developers.figma.com/docs/rest-api/component-endpoints/

## Verified Enums

### Paint types (all 9)
`SOLID`, `GRADIENT_LINEAR`, `GRADIENT_RADIAL`, `GRADIENT_ANGULAR`, `GRADIENT_DIAMOND`, `IMAGE`, `EMOJI`, `VIDEO`, `PATTERN`

### Effect types (all 6)
`INNER_SHADOW`, `DROP_SHADOW`, `LAYER_BLUR`, `BACKGROUND_BLUR`, `TEXTURE`, `NOISE`

### layoutMode
`"NONE"`, `"HORIZONTAL"`, `"VERTICAL"`, `"GRID"`

### layoutSizingHorizontal / layoutSizingVertical
`"FIXED"`, `"HUG"`, `"FILL"`
- HUG valid only on auto-layout frames and text nodes
- FILL valid only on children of auto-layout frames

### primaryAxisSizingMode / counterAxisSizingMode (older API)
`"FIXED"`, `"AUTO"` (both default AUTO)

### primaryAxisAlignItems
`"MIN"`, `"CENTER"`, `"MAX"`, `"SPACE_BETWEEN"` (default MIN)

### counterAxisAlignItems
`"MIN"`, `"CENTER"`, `"MAX"`, `"BASELINE"` (default MIN)

### counterAxisAlignContent (wrap-only)
`"AUTO"`, `"SPACE_BETWEEN"` (default AUTO)

### layoutWrap
`"NO_WRAP"`, `"WRAP"`

### layoutPositioning
`"ABSOLUTE"`, `"AUTO"` (default AUTO)

### strokeAlign
`"INSIDE"`, `"OUTSIDE"`, `"CENTER"`

### textCase
`"ORIGINAL"`, `"UPPER"`, `"LOWER"`, `"TITLE"`, `"SMALL_CAPS"`, `"SMALL_CAPS_FORCED"`

### textTruncation
`"DISABLED"`, `"ENDING"`

### lineHeightUnit
`"PIXELS"`, `"FONT_SIZE_%"`, `"INTRINSIC_%"`

### maskType
`"ALPHA"`, `"VECTOR"`, `"LUMINANCE"`

### layoutAlign (per-child, legacy)
`"INHERIT"`, `"STRETCH"` (new); `"MIN"`, `"CENTER"`, `"MAX"`, `"STRETCH"` (legacy)

## Verified Properties

### TypeStyle
- `letterSpacing`: Number (px only, **no letterSpacingUnit field exists**)
- `lineHeightPx`: Number
- `lineHeightPercent`: Number (deprecated)
- `lineHeightPercentFontSize`: Number
- `lineHeightUnit`: see enum above
- `fontFamily`, `fontWeight`, `fontSize`: standard
- `textCase`, `textAlignHorizontal`, `textAlignVertical`: standard
- `textTruncation`: see enum above
- `maxLines`: Number (default null)

### Grid-specific (layoutMode: "GRID" only)
Container-level:
- `gridRowCount`, `gridColumnCount`: Number
- `gridRowGap`, `gridColumnGap`: Number (default 0)
- `gridColumnsSizing`, `gridRowsSizing`: CSS grid template strings

Per-child:
- `gridChildHorizontalAlign`, `gridChildVerticalAlign`: `"AUTO"` | `"MIN"` | `"CENTER"` | `"MAX"`
- `gridRowSpan`, `gridColumnSpan`: Number (default 1)
- `gridColumnAnchorIndex`, `gridRowAnchorIndex`: Number (default 0)

### Other layout
- `paddingTop/Right/Bottom/Left`: Number (default 0)
- `itemSpacing`: Number (default 0, can be negative)
- `counterAxisSpacing`: Number (default 0, wrap-only)
- `clipsContent`: Boolean

### Geometry
- `absoluteBoundingBox`: Rectangle (x, y, width, height)
- `absoluteRenderBounds`: Rectangle (includes shadows/strokes), null if invisible
- `relativeTransform`: 2D matrix (requires geometry=paths)
- `size`: Vector (requires geometry=paths)

### Visual
- `fills`, `strokes`: Paint[] (default [])
- `strokeWeight`: Number
- `strokeDashes`: Number[] (default [])
- `cornerRadius`: Number (uniform)
- `rectangleCornerRadii`: Number[4] (per-corner, top-left clockwise)
- `cornerSmoothing`: Number (0-1)
- `opacity`: Number (default 1)
- `blendMode`: BlendMode (values not enumerated in docs)
- `effects`: Effect[] (default [])

### Masking
- `isMask`: Boolean (default false)
- `maskType`: see enum above

## Unverified / Undocumented

- **`rotation`**: NOT listed as a REST API node property. May appear via passthrough or may be plugin-API-only. The `relativeTransform` matrix encodes rotation but requires `geometry=paths`.
- **`visible`**: standard convention is default `true`, but default not documented in REST API pages we checked.
- **`blendMode` values**: type is `BlendMode` but enum values not enumerated. Standard set includes PASS_THROUGH, NORMAL, DARKEN, MULTIPLY, LINEAR_BURN, COLOR_BURN, LIGHTEN, SCREEN, LINEAR_DODGE, COLOR_DODGE, OVERLAY, SOFT_LIGHT, HARD_LIGHT, DIFFERENCE, EXCLUSION, HUE, SATURATION, COLOR, LUMINOSITY — but this is from general knowledge, not verified against current docs.
- **`LayoutConstraint` values**: type referenced but not expanded. Known: MIN, MAX, CENTER, STRETCH, SCALE. May have others.
- **`boundVariables`**, **`explicitVariableModes`**: not mentioned in node types page. These are documented elsewhere (global properties page) but we didn't fetch that successfully.

## Corrections Applied to DR-003

1. **letterSpacing**: external reviewer incorrectly asserted `letterSpacingUnit: "PIXELS" | "PERCENT"` exists. Reverted to px-only.
2. **ConstraintMode**: removed `"fixed"` — not a documented Figma constraint value.
3. **rotation**: marked as best-effort, not guaranteed in REST API.
4. **counterAxisAlignContent / counterAxisSpacing**: exist but omitted from DE-003 scope (wrap refinements, low impact).

## Properties Not in DE-003 Scope (acknowledged gaps)

- Grid per-child placement: `gridRowSpan`, `gridColumnSpan`, `gridChildHorizontalAlign`, `gridChildVerticalAlign`, `gridColumnAnchorIndex`, `gridRowAnchorIndex`
- Grid template sizing: `gridColumnsSizing`, `gridRowsSizing`
- Counter-axis wrap refinements: `counterAxisAlignContent`, `counterAxisSpacing`
- Stroke details: `strokeDashes`, `strokeCap`, `strokeJoin`, `cornerSmoothing`
- Mixed-style text: `characterStyleOverrides`, `styleOverrideTable`
- Text list formatting: `lineTypes`, `lineIndentations`
