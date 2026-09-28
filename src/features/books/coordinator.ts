import { Alert, Platform } from 'react-native';
import { useBooksStore } from './store';
import { useAddTransactionDraftStore } from '@/features/transactions/addDraftStore';
import { useImportResultStore } from '@/features/imports/store';
import { useCategoriesStore } from '@/features/categories/store';
import { useBudgetsStore } from '@/features/budgets/store';
import { useFilterStore, makeScope } from '@/features/transactions/filterStore';
import { useAuthStore } from '@/features/auth/store';
import { useUndoToastStore } from '@/shared/ui/state/useUndoToastStore';
import { useExportToastStore } from '@/shared/ui/state/useExportToastStore';
import { queryClient } from '@/shared/api/queryClient';
import { USE_MOCK_API } from '@/shared/api/client';
import { getAccountEpoch } from '@/shared/session/accountEpoch';
import { hasBookOperation } from './operations';
import { useBookUIStore } from './ui/store';

let revision = 0;
let path = '';
let closeFlow: () => void = () => {};
let confirming = false;
export function setBookNavigation(nextPath: string, dismiss: () => void) { path = nextPath; closeFlow = dismiss; }
export function captureBookScope() {
  const epoch = getAccountEpoch(), bookId = useBooksStore.getState().selectedBookId, generation = revision;
  return () => epoch === getAccountEpoch() && bookId === useBooksStore.getState().selectedBookId && generation === revision;
}
function confirmDiscard(): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(typeof window !== 'undefined' && window.confirm('Discard this unfinished form and switch cash books?'));
  return new Promise(resolve => Alert.alert('Discard unfinished form?', 'Switching cash books will discard your changes.', [
    { text: 'Keep editing', style: 'cancel', onPress: () => resolve(false) },
    { text: 'Discard and switch', style: 'destructive', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}
export async function selectBook(id: string, confirm: () => Promise<boolean> = confirmDiscard) {
  const state = useBooksStore.getState();
  if (id === state.selectedBookId) { useBookUIStore.getState().close(); return true; }
  if (confirming || state.isManaging || hasBookOperation()) throw new Error('Wait for the current operation before switching books.');
  if (!state.ready || !state.books.some(b => b.id === id)) throw new Error('This book is no longer available. Reload cash books.');
  const draft = useAddTransactionDraftStore.getState();
  const unfinished = /^\/modals\/(add-transaction|edit-transaction|category-editor|budget-editor|import-transactions)/.test(path) ||
    Boolean(draft.bookId && (draft.amount !== '0' || draft.title || draft.note || draft.categoryId));
  const isCurrent = captureBookScope();
  if (unfinished) {
    confirming = true;
    try { if (!await confirm()) return false; } finally { confirming = false; }
  }
  if (!isCurrent() || hasBookOperation() || useBooksStore.getState().isManaging || !useBooksStore.getState().books.some(b => b.id === id)) return false;
  useBooksStore.getState().setSelectedBookId(id);
  useBookUIStore.getState().close();
  return true;
}
function queryForBook(key: readonly unknown[], id: string) {
  return key[0] === 'transactions' ? key[3] === id : ['balance', 'summary', 'summaryRange', 'budgets'].includes(String(key[0])) && key[1] === id;
}
/** Called synchronously for every selection source, before any destination render. */
function transition(previousId: string, nextId: string) {
  revision++;
  useAddTransactionDraftStore.getState().reset();
  useImportResultStore.getState().clear();
  useUndoToastStore.getState().hide();
  useExportToastStore.getState().hide();
  useCategoriesStore.setState({ lastCreatedCategoryId: null, error: null, isLoading: false });
  useBudgetsStore.setState({ error: null, isLoading: false });
  const scope = makeScope(useAuthStore.getState().user?.id, previousId);
  useFilterStore.getState().cancelDraft(scope);
  if (path.startsWith('/modals/') && previousId) closeFlow();
  void queryClient.cancelQueries({ predicate: q => queryForBook(q.queryKey, previousId) });
  if (!nextId || !useBooksStore.getState().ready || useAuthStore.getState().sessionStatus !== 'authenticated') return;
  void queryClient.invalidateQueries({ predicate: q => queryForBook(q.queryKey, nextId) });
  void useCategoriesStore.getState().loadCategories(nextId).catch(() => {});
  const date = new Date();
  const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  void useBudgetsStore.getState().loadBudgets(nextId, month).catch(() => {});
}
export function installBookCoordinator() {
  if (!USE_MOCK_API) return () => {};
  return useBooksStore.subscribe((state, previous) => {
    if (state.selectedBookId !== previous.selectedBookId || (state.ready && !previous.ready)) transition(previous.selectedBookId, state.selectedBookId);
  });
}
