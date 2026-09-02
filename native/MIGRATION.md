# Native web migration

This directory contains browser native replacements for the original AstroUNL Flash simulations.

## Goal

The target is not an SWF compatibility layer. Each migrated simulation should expose its scientific model, teaching text, controls and visuals as editable source.

## Standard structure

```text
native/
  simulation-name/
    index.html
    styles.css
    app.js
    assets/
```

Assets are optional. Prefer inline SVG for diagrams that benefit from direct editing.

## Technical rules

* Preserve the original scientific relationship and interaction intent.
* Cross check calculations against the original source, ActionScript when available, and known later ports when useful.
* Use HTML for controls and explanatory text.
* Use SVG for diagrams, geometry and astronomy visualizations where practical.
* Use Canvas only when the animation has many rapidly changing objects or pixel based effects.
* Keep core scientific calculations in plain JavaScript functions that can be read and tested independently.
* Avoid SWF embedding in native ports.
* Avoid a framework unless a particular simulation genuinely benefits from one.
* Support pointer, touch and keyboard input.
* Make layouts responsive rather than reproducing the fixed Flash stage size.
* Keep the original FLA, SWF and related source files unchanged as an archive and verification reference.

## Migration levels

### Level 1: direct interactive diagram

Best for geometry demonstrations, graphs, coordinate systems and simple manipulatives.

Preferred implementation: HTML, SVG and JavaScript.

### Level 2: animated scientific model

Best for orbit motion, stellar evolution sequences and simulations with continuous time.

Preferred implementation: HTML, SVG or Canvas, requestAnimationFrame and JavaScript modules.

### Level 3: complex application

Best for multi panel tools, games, resource browsers or simulations with a large state model.

Preferred implementation: modular JavaScript with a small application architecture. Add a framework only when it reduces complexity.

## Status

| Port | Legacy source | Native source | Status |
| --- | --- | --- | --- |
| Small Angle Approximation Demonstrator | `flashdev2/smallAngleDemo/` | `native/small-angle-demo/` | First native port implemented |

## Small angle cross check

The native port preserves the same teaching relationship used by the later HTML5 interpretation of the AstroUNL simulator:

```text
angular size in arcseconds = 206265 × linear diameter / distance
```

The default state is distance 40 units and diameter 2 units. Distance is constrained to 20 through 60 units and diameter to 1 through 3 units.

The new implementation removes React, PIXI and MathJax dependencies from this particular simulator. The geometry is drawn directly in SVG and all interaction logic is contained in `app.js`.

## Recommended conversion workflow for each remaining simulator

1. Locate the latest FLA and matching SWF and HTML wrapper.
2. Locate ActionScript or external data used by the movie.
3. Record the Flash stage size, controls, variables, formulas, states and animation timing.
4. Cross check the live or archived simulator when available.
5. Separate scientific model code from view code.
6. Rebuild controls in HTML.
7. Rebuild the visual layer in SVG or Canvas.
8. Test numeric limits, reset state, dragging, animation and keyboard behavior.
9. Add the port to `native/index.html`.
10. Leave the legacy files intact.

## Migration sequence

The next useful batch should prioritize teaching simulators with clear standalone interactions before large browser or question bank applications. Astronomy geometry and coordinate demonstrations are particularly suitable for SVG ports and establish reusable components for later simulations.
