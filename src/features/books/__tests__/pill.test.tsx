import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { BookSwitcherPill } from '../ui/BookSwitcherPill';
import { useBooksStore, normalizeBook } from '../store';
import { useBookUIStore } from '../ui/store';
beforeEach(() => { useBooksStore.setState({ books: [], selectedBookId: '', ready: false, error: null, isManaging: false }); useBookUIStore.getState().close(); });
it('withholds an unvalidated persisted name', () => {
  useBooksStore.setState({ books: [normalizeBook({ id: 'old', name: 'Stale' })], selectedBookId: 'old' });
  render(<BookSwitcherPill />); expect(screen.queryByText('Stale')).toBeNull();
});
it('shows a single book and opens the switcher', () => {
  useBooksStore.setState({ books: [normalizeBook({ id: 'a', name: 'Personal' })], selectedBookId: 'a', ready: true });
  render(<BookSwitcherPill />); fireEvent.press(screen.getByLabelText('Switch cash book, current book Personal'));
  expect(useBookUIStore.getState().sheet).toBe('switcher');
});
it('does not substitute the first book for an invalid selection', () => {
  useBooksStore.setState({ books: [normalizeBook({ id: 'a', name: 'Other book' })], selectedBookId: 'gone', ready: true });
  render(<BookSwitcherPill />); expect(screen.queryByText('Other book')).toBeNull(); expect(screen.getByLabelText('Retry loading cash books')).toBeTruthy();
});
