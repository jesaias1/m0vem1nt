import { describe, expect, it } from 'vitest';
import { shouldPlayIntro } from '../src/ui/IntroSplash';

function memory(): Pick<Storage, 'getItem' | 'setItem'> {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('first-visit intro', () => {
  it('plays once, then never again', () => {
    const storage = memory();
    expect(shouldPlayIntro(storage)).toBe(true);
    expect(shouldPlayIntro(storage)).toBe(false);
  });
  it('is skipped when storage is unavailable or throws', () => {
    expect(shouldPlayIntro(null)).toBe(false);
    expect(shouldPlayIntro({ getItem: () => { throw new Error('blocked'); }, setItem: () => {} })).toBe(false);
  });
});
