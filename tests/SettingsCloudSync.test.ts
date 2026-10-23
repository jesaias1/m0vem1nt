import { describe, expect, it } from 'vitest';
import { sanitizeCloudSettings } from '../src/online/SettingsCloudSync';

const template = { fov: 100, masterVolume: 0.8, hideHud: false, graphics: 'AUTO' };

describe('cloud settings validation', () => {
  it('keeps known keys of the right type', () => {
    expect(sanitizeCloudSettings({ fov: 110, hideHud: true, graphics: 'HIGH' }, template)).toEqual({ fov: 110, hideHud: true, graphics: 'HIGH' });
  });

  it('drops unknown keys, wrong types, non-finite numbers and long strings', () => {
    const raw = { fov: '110', masterVolume: Number.NaN, hideHud: 1, graphics: 'X'.repeat(80), evil: 1, __proto__: { polluted: true } };
    expect(sanitizeCloudSettings(raw, template)).toEqual({});
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('copes with junk input', () => {
    for (const junk of [null, undefined, 5, 'x', [], [1, 2]]) expect(sanitizeCloudSettings(junk, template)).toEqual({});
  });
});
