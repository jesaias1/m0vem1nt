/**
 * BONUS SIGNAL DROPS (Shift+M): asks the server for the one-time bonus.
 * The server enforces "one time per account"; this only calls it and words the result.
 */

import { online } from './supabaseClient';
import { authService } from './AuthService';

export type BonusClaim = { ok: true; granted: number } | { ok: false; detail: string };

export async function claimBonusSignalDrops(): Promise<BonusClaim> {
  const client = online.getClient();
  if (!client || !authService.getUserId()) return { ok: false, detail: 'OFFLINE // CANNOT CLAIM THE BONUS' };
  if (!authService.isRegisteredAccount()) return { ok: false, detail: 'LOG IN TO CLAIM THE BONUS' };
  try {
    const { data, error } = await client.rpc('claim_bonus_signal_drops_v1');
    if (error) {
      if (/registered account/i.test(error.message)) return { ok: false, detail: 'LOG IN TO CLAIM THE BONUS' };
      if (/claim_bonus|function|schema cache/i.test(error.message)) return { ok: false, detail: 'BONUS NOT AVAILABLE YET' };
      return { ok: false, detail: `BONUS FAILED // ${error.message.toUpperCase()}` };
    }
    return { ok: true, granted: typeof data === 'number' ? data : 0 };
  } catch (err) {
    return { ok: false, detail: `BONUS FAILED // ${err instanceof Error ? err.message.toUpperCase() : 'UNKNOWN'}` };
  }
}
