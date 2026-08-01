---
name: Industrial Logic
colors:
  surface: '#faf9fd'
  surface-dim: '#dad9dd'
  surface-bright: '#faf9fd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f7'
  surface-container: '#efedf1'
  surface-container-high: '#e9e7eb'
  surface-container-highest: '#e3e2e6'
  on-surface: '#1a1c1e'
  on-surface-variant: '#43474e'
  inverse-surface: '#2f3033'
  inverse-on-surface: '#f1f0f4'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#455f88'
  primary: '#002045'
  on-primary: '#ffffff'
  primary-container: '#1a365d'
  on-primary-container: '#86a0cd'
  inverse-primary: '#adc7f7'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#321b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#4f2e00'
  on-tertiary-container: '#c6955e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#adc7f7'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#2d476f'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffddba'
  tertiary-fixed-dim: '#f2bc82'
  on-tertiary-fixed: '#2b1700'
  on-tertiary-fixed-variant: '#633f0f'
  background: '#faf9fd'
  on-background: '#1a1c1e'
  surface-variant: '#e3e2e6'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  tree-gutter-x: 64px
  tree-gutter-y: 40px
---

## Brand & Style
The design system focuses on the precision and analytical rigor required for industrial Root Cause Analysis (Arbol Causal). The brand personality is authoritative, reliable, and hyper-functional, minimizing cognitive load during high-stakes investigations. 

The style is a blend of **Minimalism** and **Corporate/Modern** aesthetics. It utilizes a "Utility-First" visual language where form strictly follows function. Visual flourish is replaced by clarity; density is managed through purposeful white space and a rigid structural grid. The emotional response should be one of calm, methodical control and technical confidence.

## Colors
This design system utilizes a high-functionality palette optimized for status signaling and data hierarchy.

- **Primary (#1a365d):** A deep industrial blue used for primary actions, navigation headers, and core structural elements. It conveys stability and professional depth.
- **Semantic Palette:** These colors are reserved strictly for status mapping in the causal tree. **Success Green** indicates verified facts or confirmed causes; **Danger Red** marks discarded hypotheses or critical failures; **Warning Amber** identifies pending investigations or unverified nodes.
- **Neutral Palette:** A base of cool-toned whites and slates (#f8fafc) provides a low-contrast canvas that allows the colored status indicators to stand out without causing visual fatigue.

## Typography
We employ **Inter** for its exceptional legibility in data-dense environments and neutral, systematic tone. 

- **Hierarchy:** Use `display-lg` only for dashboard titles. Node titles within the causal tree should use `title-lg` for readability at various zoom levels.
- **Micro-copy:** `label-md` is used for status tags and metadata headers within cards, utilizing a slight tracking increase for clarity in uppercase.
- **Technical Data:** For timestamps, machine IDs, or telemetry data within investigation notes, use a secondary monospaced font (JetBrains Mono) to distinguish raw data from human analysis.

## Layout & Spacing
The layout follows a **Fluid Grid** for the main dashboard but switches to a **Dynamic Canvas** for the Root Cause Analysis tree.

- **Tree Layout:** Nodes are connected using a horizontal or vertical branching logic. Maintain a consistent `tree-gutter-x` of 64px between causal levels to ensure dependency lines are clearly visible and not overlapping.
- **Side Panels:** Use a fixed 380px right-hand panel for node details, ensuring the main tree remains interactive while editing.
- **Grid:** A standard 8px baseline grid governs all component internal spacing to maintain industrial alignment.

## Elevation & Depth
In this design system, depth is used to communicate interactivity and focus rather than decoration.

- **Tonal Layers:** The main canvas uses the base background (#f8fafc). Elevated panels and cards use a pure white (#ffffff) surface with a `1px` stroke in a soft gray (#e2e8f0).
- **Interactive State:** Only the currently selected node in the causal tree should receive a subtle, ambient shadow (10% opacity primary color) to indicate "Active Focus."
- **Ghost Outlines:** Use low-contrast outlines for inactive or "discarded" nodes to visually recede them into the background without removing them from the logic flow.

## Shapes
Following the industrial-tech aesthetic, shapes are geometric and disciplined. 

- **Nodes & Cards:** Use a `0.25rem` (Soft) border radius. This provides enough softening to be modern while maintaining the structured, rectangular feel of engineering diagrams.
- **Buttons & Chips:** Maintain the same `0.25rem` radius. Avoid pill-shaped elements as they appear too casual for a technical RCA environment.
- **Dependency Lines:** Connection lines between nodes should be 2px thick with "elbow" (orthogonal) routing, using sharp 90-degree turns rather than curves to reinforce the systematic nature of the tool.

## Components
Consistent styling across the investigation interface:

- **Tree Nodes:** The central component. Each node features a colored top-border (2px) indicating its status (Success/Danger/Warning). Titles are bold, with a sub-text area for "Evidence" or "Owner."
- **Hypothesis Toggle Chips:** Used to switch the logic state of a node. When "Verified," the chip fills with the success color. When "Discarded," it uses a strike-through text style and danger-red border.
- **Action Buttons:** Primary actions use the Industrial Blue (#1a365d) with white text. Secondary actions use a ghost-style (outline) to remain unobtrusive.
- **Status Indicators:** Small, solid-color dots paired with `label-md` typography to indicate the health of specific data streams or evidence links.
- **Dependency Lines:** Use a neutral slate color (#94a3b8). If a causal path is "Confirmed," the line weight increases to 3px and changes to the Primary Blue.
- **Input Fields:** Rectangular with a 1px slate border. Focus states are indicated by a 1px primary blue inset ring.