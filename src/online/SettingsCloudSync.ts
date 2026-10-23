/**
 * SETTINGS CLOUD SYNC: a registered account's game settings follow the player to
 * any browser or device.
 *
 * - After sign-in the account's saved settings are applied (the cloud copy wins, so
 *   a fresh browser or a new domain restores what the player had). An account with
 *   no saved copy yet uploads this device's settings instead.
 * - After that, every settings change is saved to the account a moment later.
 * - Nothing is uploaded before the first pull, so a fresh device's defaults can
 *   never overwrite the real settings in the cloud.
 * - Cloud values are validated against the current settings (known keys, same
 *   type, finite numbers) before they are applied.
 */

import { SettingsManager } from '../core/Settings';
import { authService } from './AuthService';
import { online } from './supabaseClient';

const PUSH_DEBOUNCE_MS = 1500;

/** Keeps only keys the game knows, with the same type, finite numbers and short strings. */
export function sanitizeCloudSettings(raw: unknown, template: Record<string, unknown>): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Object.prototype.hasOwnProperty.call(template, key)) continue;
    if (typeof value !== typeof template[key]) continue;
    if (typeof value === 'number' && !Number.isFinite(value)) continue;
    if (typeof value === 'string' && value.length > 40) continue;
    out[key] = value;
  }
  return out;
}

class SettingsCloudSync {
  /** The account whose cloud settings this device has loaded (uploads are allowed). */
  private loadedUid: string | null = null;
  private timer: number | null = null;
  private applying = false;
  private unsubscribe: (() => void) | null = null;

  /** Applies the account's saved settings, or uploads this device's if it has none. */
  public async pull(): Promise<'APPLIED' | 'UPLOADED' | 'SKIPPED' | 'ERROR'> {
    const client = online.getClient();
    const uid = authService.getUserId();
    if (!client || !uid || !authService.isRegisteredAccount()) return 'SKIPPED';
    try {
      const { data, error } = await client.from('player_settings').select('settings').eq('user_id', uid).maybeSingle();
      if (error) return 'ERROR';
      // The account may have changed while the request was in flight.
      if (authService.getUserId() !== uid) return 'SKIPPED';
      const manager = SettingsManager.getInstance();
      const saved = sanitizeCloudSettings(data?.settings, manager.settings as unknown as Record<string, unknown>);
      this.loadedUid = uid;
      this.listen();
      if (Object.keys(saved).length > 0) {
        this.applying = true;
        try {
          manager.update(saved as never);
        } finally {
          this.applying = false;
        }
        return 'APPLIED';
      }
      await this.push();
      return 'UPLOADED';
    } catch {
      return 'ERROR';
    }
  }

  /** Forget the account (sign-out): nothing is uploaded until the next sign-in's pull. */
  public reset(): void {
    this.loadedUid = null;
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
  }

  private listen(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = SettingsManager.getInstance().subscribe(() => this.schedulePush());
  }

  private schedulePush(): void {
    if (!this.loadedUid || this.applying) return;
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.push(), PUSH_DEBOUNCE_MS);
  }

  private async push(): Promise<void> {
    const client = online.getClient();
    const uid = authService.getUserId();
    if (!client || !uid || uid !== this.loadedUid) return;
    try {
      await client.from('player_settings').upsert(
        { user_id: uid, settings: SettingsManager.getInstance().settings, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    } catch {
      /* best effort: the settings are still saved on this device */
    }
  }
}

export const settingsCloudSync = new SettingsCloudSync();
