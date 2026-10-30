import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const state = { client: { rpc } as unknown, uid: 'u1' as string | null, registered: true };

vi.mock('../src/online/supabaseClient', () => ({ online: { getClient: () => state.client } }));
vi.mock('../src/online/AuthService', () => ({
  authService: { getUserId: () => state.uid, isRegisteredAccount: () => state.registered }
}));

import { claimBonusSignalDrops } from '../src/online/BonusDrops';

describe('bonus signal drops (Shift+M)', () => {
  beforeEach(() => {
    rpc.mockReset();
    state.client = { rpc };
    state.uid = 'u1';
    state.registered = true;
  });

  it('reports how many drops the server granted, and 0 when already claimed', async () => {
    rpc.mockResolvedValueOnce({ data: 20, error: null });
    expect(await claimBonusSignalDrops()).toEqual({ ok: true, granted: 20 });
    rpc.mockResolvedValueOnce({ data: 0, error: null });
    expect(await claimBonusSignalDrops()).toEqual({ ok: true, granted: 0 });
  });

  it('asks guests to log in without calling the server', async () => {
    state.registered = false;
    expect(await claimBonusSignalDrops()).toEqual({ ok: false, detail: 'LOG IN TO CLAIM THE BONUS' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('says so when the server function is not installed yet, and when offline', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'Could not find the function public.claim_bonus_signal_drops_v1' } });
    expect(await claimBonusSignalDrops()).toEqual({ ok: false, detail: 'BONUS NOT AVAILABLE YET' });
    state.client = null;
    expect((await claimBonusSignalDrops()).ok).toBe(false);
  });
});
