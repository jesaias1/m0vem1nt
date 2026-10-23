/**
 * DIALOG FIT: no window should need scrolling to reach its buttons.
 *
 * Windows keep their design size (the pixel fonts are only crisp at whole-number
 * scales, so nothing is shrunk "just because"). Only a window that is taller than
 * the screen is shrunk (CSS zoom) just enough to fit, with the matching
 * max-height so its box ends at the screen edge. Purely presentational.
 */

const DIALOG_SELECTOR = [
  '.pause-container',
  '.settings-container',
  '.profile-container',
  '.results-container',
  '.analysis-container',
  '.armory-modal-container',
  '.armory-modal-console',
  '.movement-lab-song-container',
  '.decode-container',
  '.decode-modal-dialog',
  '.import-container.terminal-console'
].join(',');

/** Never shrink below this: smaller than that is unreadable. */
const MIN_ZOOM = 0.62;
/** Breathing room kept around a dialog, in CSS px. */
const SCREEN_MARGIN = 20;

export function fitDialog(el: HTMLElement, viewportHeight: number): number {
  el.style.zoom = '';
  el.style.maxHeight = '';
  if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return 1;
  // The stylesheet may scale windows up by a WHOLE number on very large screens
  // (see desktop.css); that is the size the window wants to be.
  const base = Number(getComputedStyle(el).zoom) || 1;
  const available = Math.max(200, viewportHeight - SCREEN_MARGIN);
  // Natural height at 1x.
  el.style.zoom = '1';
  const natural = el.scrollHeight;
  // Prefer a WHOLE-number scale (pixel fonts are only crisp at 1x, 2x, ...): the
  // largest one up to the stylesheet's that still fits the screen.
  let whole = Math.max(1, Math.floor(base + 0.001));
  while (whole > 1 && natural * whole > available) whole--;
  if (natural * whole <= available) {
    el.style.zoom = whole === base ? '' : String(whole);
    if (whole !== 1 || base !== 1) el.style.maxHeight = `${available / whole}px`;
    return whole;
  }
  // Even 1x is taller than the screen: shrink just enough (the only fractional case).
  const zoom = Math.max(MIN_ZOOM, available / natural);
  el.style.zoom = String(zoom);
  // The box limit is zoomed too, so counter it to keep the box at the screen height.
  el.style.maxHeight = `${available / zoom}px`;
  return zoom;
}

export function installDialogFit(root: HTMLElement): () => void {
  // A dialog is re-fitted when it appears, when the screen size changes, or when
  // its content grows or shrinks. Checked a few times a second as a safety net,
  // and immediately (before the next paint) when a screen is shown or hidden, so a
  // window never flashes at the wrong size.
  const seen = new WeakMap<HTMLElement, string>();
  const keyOf = (el: HTMLElement, height: number): string => {
    const visible = el.offsetParent !== null || getComputedStyle(el).position === 'fixed';
    return `${visible}|${height}|${Math.round(el.scrollHeight * (Number(el.style.zoom) || 1))}`;
  };
  const run = (): void => {
    const height = window.innerHeight;
    root.querySelectorAll<HTMLElement>(DIALOG_SELECTOR).forEach((el) => {
      if (seen.get(el) === keyOf(el, height)) return;
      fitDialog(el, height);
      seen.set(el, keyOf(el, height));
    });
  };
  const observer = new MutationObserver((records) => {
    for (const r of records) {
      const target = r.target as Element;
      // The zoom and max-height written above are ours: not a reason to fit again.
      if (r.type === 'attributes' && r.attributeName === 'style' && target.matches?.(DIALOG_SELECTOR)) continue;
      run();
      return;
    }
  });
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
  const timer = window.setInterval(run, 350);
  const onResize = (): void => {
    requestAnimationFrame(run);
  };
  window.addEventListener('resize', onResize);
  run();

  return () => {
    observer.disconnect();
    window.clearInterval(timer);
    window.removeEventListener('resize', onResize);
  };
}
