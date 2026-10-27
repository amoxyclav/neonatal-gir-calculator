# Visual QA — clinical editorial showcase

Reference: selected Option 1, the light clinical editorial direction.

## Review performed

- Desktop preview at 1440 × 1000: left navigation rail, title and primary action, fluid illustration, and all three launch cards render in the intended layout.
- Mobile preview at 390 × 844: navigation remains horizontally reachable, the hero and launch cards stack, and the document has no horizontal overflow (390 px scroll width for a 390 px viewport).
- Mobile predefined-fluid picker: its content scrolls internally and the “Add selected fluids” action remains visible at the bottom of the viewport.
- GIR calculator view: patient inputs and the fluid section remain readable in the redesigned card treatment.
- Reduced-motion preference disables the new entrance transitions.
- Existing inline scripts were compared before and after the visual changes; all six blocks are unchanged.

## Scope

Presentation and navigation markup in `index.html`, plus the generated hero image in `assets/neonatal-fluid-hero.webp`. Calculator formulas and event handlers were not changed.
