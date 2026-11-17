# Five design iterations

## Round 1 — A brighter MapleStory workspace

Problem: the dark olive theme felt like a generic technical tool, while narrow navigation competed with effect inspection.

Changes: warm paper surfaces, sky and mint navigation, maple-orange actions, an original vector maple-leaf mark, larger selected states, wider skill navigation, softer stage framing, and a light transparency grid. Dark, light, and green stage backgrounds remain independent of the interface theme. Reduced-motion preferences disable decorative transitions.

Evaluation: source review confirms the desktop inspector retains flexible width while both navigation columns scroll independently. The selected skill has both an orange edge and a filled background. Mobile breakpoints preserve readable single-column skill names. Syntax and existing player regressions pass. Browser visual review is pending because the Mac is locked; this is not a screenshot-verified round.

Next: make a 6,197-entry collection easier to navigate across classes.

## Round 2 — Find skills across the whole collection

Changes: explicit class/all-class search scope; lazy all-class indexing with four concurrent catalog requests and progress; class names in global results; class-family filters; recent classes; name/frame-count sorting; clear filters; selected-state semantics; bounded rendering of 250 results.

Evaluation: automated checks index all 6,197 entries, find Raging Blow across classes, and confirm that a one-character global query asks for refinement rather than rendering thousands of buttons. Class metadata is cached; indexing does not run on initial load. Global favorites use class-qualified keys. Source review identified no need for a new backend or hosting changes. Visual review remains pending while the Mac is locked.

Next: improve precise motion study, especially repeating only the frames of interest.

## Round 3 — A motion-study workbench

Changes: direct frame entry and per-frame delay/origin readouts; a collapsible study range with mark-in/mark-out; forward, reverse, and ping-pong playback; a previous-frame overlay; focus mode and full screen. Playback is gated until loading finishes. Playback-session tokens prevent stale asynchronous callbacks from restarting playback after a skill switch. Range controls reset on each new layer.

Evaluation: deterministic player tests cover range clamping, forward stopping, reverse wrapping, ping-pong turnarounds, and a non-looping return to the start. Full-sequence scrubbing remains available outside the study range. Overlay pixels are kept out of still exports. The overlay and optional origin marker do not replace the original frame. Syntax and previous browsing regressions pass. Full-screen and touch behavior still require browser QA.

Next: turn frame selection into reusable visual-reference exports.

## Round 4 — Reusable frame exports

Changes: an export dialog with output dimensions, original/2×/4× scale, configurable columns and padding; transparent single-frame and sprite-sheet PNGs; labeled contact sheets; timing/origin JSON. Sheets use the selected study range and a shared origin. Export snapshots isolate the operation from later selection changes. Canvas dimensions are capped at 8,192 pixels per side and 24 million total pixels.

Evaluation: independent export-geometry tests cover shared-origin alignment, mirroring metadata, original-size PNG geometry, contact-sheet labels, range frame numbers, and oversized-sheet rejection. Player regressions pass. The export state disables downloads until all selected images load and rejects incomplete exports. PNG encoding and contact-sheet appearance still need browser verification; initial-version single-frame PNG alpha was previously verified.

Next: review the complete experience for accessibility, loading failures, navigation continuity, and mobile usability.
