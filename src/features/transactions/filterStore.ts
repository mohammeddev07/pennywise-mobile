import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Ymd } from "@/shared/utils/ledgerDate";
import {
  canonicalKey,
  defaultRoot,
  emptyRoot,
  refreshPresets,
  sanitizeSort,
  sortKey,
  toWire,
  validateTree,
  type FilterRoot,
  type SortState,
} from "./filterModel";

/**
 * Activity's filter state. Zustand owns what the user has *chosen* (drafts, the
 * applied expression, sorts); TanStack Query owns everything fetched with it.
 *
 * State is keyed per `accountId:bookId`, so switching books or accounts can never
 * show - or send - another scope's filter. `revision` increases every time the
 * applied query actually changes and is the single number results are coordinated
 * against.
 */

export type ScopeKey = string;

export function makeScope(accountId: string | null | undefined, bookId: string | null | undefined): ScopeKey {
  return `${accountId ?? ""}:${bookId ?? ""}`;
}

type Applied = { root: FilterRoot; sort: SortState; revision: number };
type Draft = { root: FilterRoot; sort: SortState };

type State = {
  byScope: Record<ScopeKey, Applied>;
  /** Advanced-sheet drafts. Never persisted; Cancel simply drops it. */
  drafts: Record<ScopeKey, Draft | undefined>;

  /** Seeds a scope with the default filter, or rolls its presets forward to `today`. */
  ensure: (scope: ScopeKey, today: Ymd) => void;
  /** Applies a whole expression atomically (quick filter changes). */
  applyRoot: (scope: ScopeKey, root: FilterRoot) => void;
  applySort: (scope: ScopeKey, sort: SortState) => void;
  /** Back to the default filter (Today, no other conditions) and default sort. */
  reset: (scope: ScopeKey, today: Ymd) => void;
  /** Clears every condition, date included ("All dates"). */
  clearAll: (scope: ScopeKey) => void;

  beginDraft: (scope: ScopeKey) => void;
  setDraft: (scope: ScopeKey, draft: Partial<Draft>) => void;
  /**
   * Applies the draft only if it validates; returns whether it did. `part` says which half the
   * sheet edited: the other half stays whatever is applied *now*, so a sheet opened for sorting
   * can never write back a stale copy of the filter (e.g. a search that committed meanwhile).
   */
  applyDraft: (scope: ScopeKey, part: "filter" | "sort") => boolean;
  cancelDraft: (scope: ScopeKey) => void;

  clearAllScopes: () => void;
};

function sameQuery(a: Applied | Draft, root: FilterRoot, sort: SortState) {
  return canonicalKey(toWire(a.root)) === canonicalKey(toWire(root)) && sortKey(a.sort) === sortKey(sort);
}

export const useFilterStore = create<State>()(
  persist(
    (set, get) => {
      const commit = (scope: ScopeKey, root: FilterRoot, sort: SortState) => {
        const current = get().byScope[scope];
        if (current && sameQuery(current, root, sort)) {
          // Same query: keep the chosen tree (ids, raw text) but do not bump the revision,
          // so nothing refetches or resets its scroll position.
          set((s) => ({ byScope: { ...s.byScope, [scope]: { ...current, root, sort } } }));
          return;
        }
        set((s) => ({
          byScope: {
            ...s.byScope,
            [scope]: { root, sort, revision: (current?.revision ?? 0) + 1 },
          },
        }));
      };

      return {
        byScope: {},
        drafts: {},

        ensure: (scope, today) => {
          const current = get().byScope[scope];
          if (!current) {
            set((s) => ({ byScope: { ...s.byScope, [scope]: { root: defaultRoot(today), sort: [], revision: 1 } } }));
            return;
          }
          const rolled = refreshPresets(current.root, today);
          if (rolled !== current.root) commit(scope, rolled, current.sort);
        },

        applyRoot: (scope, root) => commit(scope, root, get().byScope[scope]?.sort ?? []),
        applySort: (scope, sort) => commit(scope, get().byScope[scope]?.root ?? emptyRoot(), sanitizeSort(sort)),
        reset: (scope, today) => commit(scope, defaultRoot(today), []),
        clearAll: (scope) => commit(scope, emptyRoot(), get().byScope[scope]?.sort ?? []),

        beginDraft: (scope) => {
          const current = get().byScope[scope];
          set((s) => ({
            drafts: { ...s.drafts, [scope]: { root: current?.root ?? emptyRoot(), sort: current?.sort ?? [] } },
          }));
        },
        setDraft: (scope, draft) =>
          set((s) => {
            const cur = s.drafts[scope];
            if (!cur) return s;
            return { drafts: { ...s.drafts, [scope]: { ...cur, ...draft } } };
          }),
        applyDraft: (scope, part) => {
          const draft = get().drafts[scope];
          if (!draft) return false;
          const current = get().byScope[scope];
          if (part === "filter") {
            if (!validateTree(draft.root).valid) return false;
            commit(scope, draft.root, current?.sort ?? []);
          } else {
            commit(scope, current?.root ?? emptyRoot(), sanitizeSort(draft.sort));
          }
          set((s) => ({ drafts: { ...s.drafts, [scope]: undefined } }));
          return true;
        },
        cancelDraft: (scope) => set((s) => ({ drafts: { ...s.drafts, [scope]: undefined } })),

        clearAllScopes: () => set({ byScope: {}, drafts: {} }),
      };
    },
    {
      name: "pennywise_activity_filters_v1",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ byScope: s.byScope }),
    }
  )
);
