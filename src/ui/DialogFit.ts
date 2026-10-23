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
  const wanted = Math.min(base, Math.max(MIN_ZOOM, available / natural));
  if (wanted >= base - 0.001) {
    // Fits at its own size: hand scaling back to the stylesheet (whole numbers only).
    el.style.zoom = '';
    if (base !== 1) el.style.maxHeight = `${available / base}px`;
    return base;
  }
  el.style.zoom = String(wanted);
  // The box limit is zoomed too, so counter it to keep the box at the screen height.
  el.style.maxHeight = `${available / wanted}px`;
  return wanted;
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
