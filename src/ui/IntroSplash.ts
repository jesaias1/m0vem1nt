/**
 * OPENING INTRO: a retro desktop opens a window around the m0vem1nt logo and
 * "starts" the game. Played once per browser tab/session (never when returning
 * to the menu from a run, nor on a refresh in the same tab); any key or click skips it. Purely cosmetic: the
 * game boots underneath while it plays.
 */

const STYLE_ID = 'm0vem1nt-intro-style';

const CSS = `
.m0-intro{position:fixed;inset:0;z-index:100000;background:radial-gradient(ellipse at 50% 120%,#1b4a52 0,transparent 60%),linear-gradient(#06121a,var(--desktop,#112c32));display:flex;align-items:center;justify-content:center;font:16px/1.3 'Pixel Sans',Tahoma,sans-serif;color:var(--ink,#f0f0f0);cursor:default;transition:opacity .45s steps(5)}
.m0-intro.m0-out{opacity:0}
.m0-intro-grid{position:absolute;left:0;right:0;bottom:0;height:42%;background:repeating-linear-gradient(0deg,rgba(0,240,255,.14) 0 1px,transparent 1px 28px),repeating-linear-gradient(90deg,rgba(0,240,255,.1) 0 1px,transparent 1px 48px);mask-image:linear-gradient(transparent,#000);-webkit-mask-image:linear-gradient(transparent,#000);pointer-events:none}
.m0-intro-ghost{position:absolute;left:50%;top:50%;width:28px;height:20px;border:2px dotted #8ff;transform:translate(-50%,-50%);mix-blend-mode:difference;animation:m0-ghost .55s steps(7) forwards}
.m0-intro-win{position:relative;width:min(440px,90vw);background:var(--face,#30343b);color:var(--ink,#f0f0f0);box-shadow:inset -1px -1px var(--shadow,#0b0d11),inset 1px 1px var(--highlight,#646d7c),inset -2px -2px var(--edge,#1d2026),inset 2px 2px var(--face-light,#414751),6px 6px 0 rgba(0,0,0,.5);padding:3px;opacity:0;animation:m0-open .5s steps(7) .5s forwards}
.m0-intro-title{display:flex;align-items:center;gap:6px;background:linear-gradient(90deg,#000080,#0a5fa0);color:#fff;font-weight:700;padding:3px 6px;font-size:14px}
.m0-intro-title img{width:16px;height:16px;image-rendering:pixelated}
.m0-intro-body{padding:22px 24px 20px;text-align:center}
.m0-intro-mascot{width:84px;height:84px;object-fit:contain;image-rendering:pixelated;animation:m0-bob 1s steps(2) infinite}
.m0-intro-logo{display:block;height:34px;max-width:100%;margin:10px auto 14px;object-fit:contain}
.m0-intro-status{min-height:1.3em;margin-bottom:10px;font-size:15px}
.m0-intro-bar{height:22px;background:var(--field,#191c22);box-shadow:inset 1px 1px var(--edge,#1d2026),inset -1px -1px var(--highlight,#646d7c),inset 2px 2px var(--shadow,#0b0d11);padding:3px;overflow:hidden}
.m0-intro-fill{height:100%;width:0;background:repeating-linear-gradient(90deg,#00f0ff 0 10px,transparent 10px 13px);animation:m0-fill 2.1s steps(18) 1s forwards}
.m0-intro-skip{position:absolute;bottom:14px;left:0;right:0;text-align:center;color:#fff;opacity:.75;font-size:13px}
@keyframes m0-ghost{from{width:28px;height:20px;opacity:1}to{width:min(440px,90vw);height:250px;opacity:.9}}
@keyframes m0-open{from{opacity:1;clip-path:inset(46% 46% 46% 46%)}to{opacity:1;clip-path:inset(0 0 0 0)}}
@keyframes m0-bob{50%{transform:translateY(-4px)}}
@keyframes m0-fill{to{width:100%}}
@media (prefers-reduced-motion:reduce){.m0-intro-ghost{display:none}.m0-intro-win{animation:none;opacity:1}.m0-intro-mascot{animation:none}}
`;

const STEPS: Array<[number, string]> = [
  [1000, 'Starting m0vem1nt...'],
  [1900, 'Tuning the signal...'],
  [2700, 'Loading the world...'],
  [3300, 'Welcome.']
];
const TOTAL_MS = 3800;

const SESSION_KEY = 'm0vem1nt.intro.session';

/** True once per browser tab/session: a refresh in the same tab does not replay it. */
export function shouldPlayIntro(storage: Pick<Storage, 'getItem' | 'setItem'> | null): boolean {
  if (!storage) return true;
  try {
    if (storage.getItem(SESSION_KEY)) return false;
    storage.setItem(SESSION_KEY, '1');
  } catch {
    /* storage blocked: just play it */
  }
  return true;
}

export function playIntro(): void {
  let storage: Storage | null = null;
  try {
    storage = window.sessionStorage;
  } catch {
    storage = null;
  }
  if (!shouldPlayIntro(storage)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.className = 'm0-intro';
  el.setAttribute('role', 'presentation');
  el.innerHTML = `
    <div class="m0-intro-grid"></div>
    <div class="m0-intro-ghost"></div>
    <div class="m0-intro-win">
      <div class="m0-intro-title"><img src="/assets/brand/m0vem1nt_mascot.png" alt="" /> M0VEM1NT</div>
      <div class="m0-intro-body">
        <img class="m0-intro-mascot" src="/assets/brand/m0vem1nt_mascot.png" alt="" />
        <img class="m0-intro-logo" src="/assets/brand/m0vem1nt_logo_text.png" alt="m0vem1nt" />
        <div class="m0-intro-status" aria-live="polite"></div>
        <div class="m0-intro-bar"><div class="m0-intro-fill"></div></div>
      </div>
    </div>
    <div class="m0-intro-skip">click or press any key to skip</div>`;
  document.body.appendChild(el);

  const status = el.querySelector<HTMLElement>('.m0-intro-status')!;
  const timers: number[] = [];
  let done = false;
  const finish = (): void => {
    if (done) return;
    done = true;
    timers.forEach((t) => window.clearTimeout(t));
    window.removeEventListener('keydown', finish, true);
    el.classList.add('m0-out');
    window.setTimeout(() => {
      el.remove();
      style.remove();
    }, 500);
  };
  for (const [at, text] of STEPS) timers.push(window.setTimeout(() => { status.textContent = text; }, at));
  timers.push(window.setTimeout(finish, TOTAL_MS));
  el.addEventListener('pointerdown', finish);
  window.addEventListener('keydown', finish, true);
}
