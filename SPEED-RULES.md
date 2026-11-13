# Ferra site: speed rules for every change

Set 2026-11-12 after visitors said the site was slow, laggy and that animations stopped at random places. Every change and every new page or section follows these rules. The finish line they protect is `design-loop/best-sites-2026-11-06/SPEED-END-CONDITION.md`; the ship gate (`tools/ship.sh`) checks them automatically and refuses to push a change that breaks one.

## The test phone

Judge everything on a cheap phone, never on this Mac: 390 wide, processor slowed four times, crowded cafe wifi (180 kilobytes a second, 300ms round trip), empty cache. `node tools/lag.cjs <url> bad 4` is that phone.

## Rules

### Scrolling and pace
1. **The same scroll moves the page the same amount everywhere.** Inside a pinned scene every screen of scrolling moves the story on. A change takes at most about two thirds of a screen (55vh on a phone, 65vh on a desktop on Home).
2. **Holds are rare, short and listed.** A pause where nothing moves is allowed only where a reader must read (a chart, a price), at most half a screen, and it is added by name to the "Allowed holds" list in the speed end condition. More than half a screen of scrolling where nothing visible changes fails the gate (`evenpace`).
3. **Words in a pinned scene still hold at least 60vh**, so they can be read (`hold`). Make the change faster, never the words.
4. **Nothing is left half finished when the reader stops.** A word swap tied to the scroll finishes on its own when scrolling stops (`hSettle` in `p-home.js`, word swaps only). Longer changes follow the scroll exactly and are never auto-finished, because an auto-finished picture makes the next bit of scrolling do nothing.
5. **Shortening a scene never changes what it shows.** Same pictures, words and order; only the scroll length changes.

### Drawing and animation
6. **Animate with transform and opacity.** Never animate height, width, top, margin or padding while the reader scrolls: it moves other things on the page (layout shift). If a box must change size, keep its top edge fixed and compensate with a transform from the top (see `sharpen` in `p-vision.js`).
7. **Canvas drawing is batched.** One path and one fill per colour, never a fill per dot. Repaint only when the picture changes, never every frame for nothing (`dotbot.js`).
8. **Start heavy things one at a time.** Several robots or films waking in the same frame stall a phone; stagger them (60ms apart, as on Fleets).
9. **Resize only on a real width change.** A phone's address bar sliding away fires height-only resizes; they must never redraw, restart or re-measure a scene (`if (innerWidth === lastWidth) return`).
10. **Every robot on screen keeps moving.** Pause robots only when they are off screen.

### Loading
11. **Words first.** Nothing big loads before the first screen's words. Films use `preload="none"` with a poster that is their exact first frame, and start once what the reader needs next has arrived.
12. **Reserve space** for anything that arrives late (figures, charts, pictures) so nothing jumps when it lands. Layout shift stays under 0.05 on every page.
13. **First screen under 1.5MB** before any film, on every page.

### Freshness
14. **Every file has a fingerprint of its contents** in its address, including files a script loads by name. `tools/refingerprint.py` does this on every release; never load an asset in a way it cannot see (build the full path as one quoted string such as `'assets/x.js'`, not by joining pieces). Pages always revalidate.

## Checks that run on every release

| Check | What it guards |
|---|---|
| `phone` | under 400ms of stalls and at most 2 hitches per page on the test phone |
| `evenpace` | no more than half a screen of scrolling where nothing changes |
| `hold` | words readable for at least 60vh |
| `fps` | desktop stays at 50 frames a second or more |
| `speed` | Google's speed score, largest paint, layout shift, first-screen weight |
| `webkit` | Safari's engine: robots move, films play, nothing restarts when the address bar slides |
| `fresh` | every fingerprint matches the file served |

Run the whole picture by hand before a big change ships: `node tools/lag.cjs <url> bad 4`, `node tools/evenpace.cjs <url> phone` and `desktop`, `node tools/webkit.cjs <url>`, `python3 tools/fresh.py <url>`.
