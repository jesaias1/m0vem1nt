import { describe, expect, it } from 'vitest';
import { shouldPlayIntro } from '../src/ui/IntroSplash';

function memory(): Pick<Storage, 'getItem' | 'setItem'> {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('opening intro', () => {
  it('plays once per session, then not again', () => {
    const storage = memory();
    expect(shouldPlayIntro(storage)).toBe(true);
    expect(shouldPlayIntro(storage)).toBe(false);
  });
  it('still plays when storage is unavailable', () => {
    expect(shouldPlayIntro(null)).toBe(true);
    expect(shouldPlayIntro({ getItem: () => { throw new Error('blocked'); }, setItem: () => {} })).toBe(true);
  });
});
