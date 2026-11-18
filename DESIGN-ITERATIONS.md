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

## Round 5 — A connected, resilient experience

Integration review caught a missing sheet-export button that permissive DOM mocks did not detect. The control is now present and a markup contract test checks every literal ID used by the player. Layer controls move above the preview. On mobile, a sticky browse toggle exposes the library on demand so the animation is visible without scrolling past two navigation panels. Shortcut help, a skip link, larger touch targets, last-selection restoration, and remembered stage backgrounds improve everyday use.

Reliability changes: safe local storage parsing/writes, direct-frame input normalization, image timeouts, a bounded decoded-image cache, unavailable-frame counts and retry, export-form keyboard behavior, and navigation history. URL writes are suppressed during playback to avoid browser history throttling. Range timing now uses the same delay function as playback. Export operations retain frozen selection snapshots.

Evaluation: previous tests plus a real-markup control contract and export geometry checks pass. The primary orange button is darkened for readable white text. Malformed storage and failed frame states are handled without blocking the rest of the interface. All 59 catalogs remain unchanged. Visual browser QA is still blocked by the locked Mac and is explicitly not claimed as complete.

Final automated integration review uses the actual HTML through jsdom, with image/canvas operations simulated. It verifies both export dialogs, mobile browse collapse after selecting a skill, favorites, range actions, global search, malformed local storage, and suppression of history writes during playback. Main text/button contrast tokens are checked against a minimum 4.5:1 ratio. These checks complement rather than replace visual rendering and actual PNG decoding.


## Studio: three additional rounds

1. **Preview hierarchy and panning removal.** Removed drag state, pointer capture, cursor hints, and canvas offsets. The preview remains centered; vertical touch scrolling is restored. Appearance settings now have their own collapsible section. Evaluation: fewer competing controls around the stage; fit and fixed zoom remain available.
2. **Deliberate frame inspection.** Added first/last controls and Home/End shortcuts, bounded single-frame stepping, a larger timeline target, and visible range endpoints with muted excluded frames. Evaluation: clearer boundaries for still selection without changing loop playback.
3. **Capture workflow.** Moved exports above secondary settings and description, added explicit still/sheet scope, collapsed appearance controls by default, and corrected frame sharing during playback by pausing before copying the current URL. Evaluation: choosing and saving a still now form one continuous workflow; export zoom independence is explained.

Validation: full existing suite plus DOM checks for boundaries, range feedback, capture context, removed pointer handlers, and exact sharing during playback. Rendered browser review could not run: Mac locked and browser access disabled. Layout conclusions are based on source review and responsive rules, not screenshots.


## Studio simplification (2026-11-18)

Owner-directed simplification: remove all labels from inside the animation container; place filmstrip directly beneath it; retain Play/Pause, a simple frame counter, scrubber, background dropdown and PNG flow. Remove step buttons, frame-number input, timing/origin readouts (including thumbnail ms), speed/direction/loop controls, study ranges and appearance settings. Fit, crisp pixels and source-origin alignment are automatic. Source timing remains intact; death actions play once automatically. Loading/error status lives outside the animation container. Keyboard stepping remains available without visible buttons.

Validation: full suite passes, including actual DOM checks that the stage contains only canvas, filmstrip is its next sibling, removed IDs are absent, background changes work, filmstrip/scrub selection works, and summon death playback/PNG/retry/navigation remain intact. Attached PDF inspected for the prior layout; its render had source font/artifact issues, so no claim of live rendered browser QA is made.
