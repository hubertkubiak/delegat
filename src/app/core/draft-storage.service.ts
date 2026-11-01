import { Service } from '@angular/core';
import type { ExpenseClaim } from '../claim/claim.model';

export interface StoredDraft {
  savedAt: string;
  claim: ExpenseClaim;
}

const KEY = 'delegat.draft.v1';

/** Persists a single claim draft in localStorage. Every access is guarded (private mode, quotas). */
@Service()
export class DraftStorage {
  save(claim: ExpenseClaim): StoredDraft {
    const draft: StoredDraft = { savedAt: new Date().toISOString(), claim };
    try {
      localStorage.setItem(KEY, JSON.stringify(draft));
    } catch {
      /* storage unavailable — the draft simply is not persisted */
    }
    return draft;
  }

  load(): StoredDraft | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<StoredDraft>;
      return typeof parsed.savedAt === 'string' && parsed.claim ? (parsed as StoredDraft) : null;
    } catch {
      return null;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
}
