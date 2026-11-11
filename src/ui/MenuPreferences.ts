export interface MenuPreferences {
  trackId: string; mode: 'NORMAL' | 'SURF'; slot: 'karambit' | 'gloves';
  /** Last signal and course chosen on the Online page. */
  raceTrackId: string; raceMode: 'NORMAL' | 'SURF';
  /** Map last picked in the map picker; kept for every next game. */
  mapKey: string;
  ownership: 'all' | 'owned' | 'locked'; family: 'all' | 'drop' | 'mastery'; sort: 'rarity' | 'name';
}
const KEY = 'playhead.menu.v1';
const defaults: MenuPreferences = { trackId: '', mode: 'NORMAL', raceTrackId: '', raceMode: 'NORMAL', mapKey: '', slot: 'karambit', ownership: 'all', family: 'all', sort: 'rarity' };
export function readMenuPreferences(): MenuPreferences {
  let raw: Record<string, unknown> = {};
  try { const value = JSON.parse(localStorage.getItem(KEY) ?? '{}'); if (value && typeof value === 'object' && !Array.isArray(value)) raw = value; } catch { /* Defaults remain usable offline/private. */ }
  const pick = <T extends string>(key: string, choices: readonly T[], fallback: T): T => choices.includes(raw[key] as T) ? raw[key] as T : fallback;
  return { mapKey: typeof raw.mapKey === 'string' ? raw.mapKey.slice(0, 60) : '', trackId: typeof raw.trackId === 'string' ? raw.trackId.slice(0, 120) : '',
    raceTrackId: typeof raw.raceTrackId === 'string' ? raw.raceTrackId.slice(0, 120) : '',
    raceMode: raw.modeVersion === 3 ? pick('raceMode', ['NORMAL', 'SURF'], defaults.raceMode) : 'NORMAL',
    // Platforms is the main mode again: menus saved before that default to it once.
    mode: raw.modeVersion === 3 ? pick('mode', ['NORMAL', 'SURF'], defaults.mode) : 'NORMAL', slot: pick('slot', ['karambit', 'gloves'], defaults.slot),
    ownership: pick('ownership', ['all', 'owned', 'locked'], defaults.ownership),
    family: pick('family', ['all', 'drop', 'mastery'], defaults.family), sort: pick('sort', ['rarity', 'name'], defaults.sort) };
}
export function saveMenuPreferences(patch: Partial<MenuPreferences>): void {
  try { localStorage.setItem(KEY, JSON.stringify({ ...readMenuPreferences(), ...patch, modeVersion: 3 })); } catch { /* Session remains functional. */ }
}
export interface TrackFilter { search: string; difficulty: string; duration: string }
export function matchesTrackFilter(track: {title: string; artist?: string; genre?: string; difficulty: number; duration: number}, filter: TrackFilter): boolean {
  const query = filter.search.trim().toLocaleLowerCase();
  const text = `${track.title} ${track.artist ?? ''} ${track.genre ?? ''}`.toLocaleLowerCase();
  return (!query || text.includes(query)) && (!filter.difficulty || Math.round(track.difficulty) === Number(filter.difficulty)) &&
    (!filter.duration || (filter.duration === 'short' ? track.duration <= 120 : filter.duration === 'medium' ? track.duration > 120 && track.duration <= 180 : track.duration > 180));
}
