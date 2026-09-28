import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { BookEditor } from '../ui/BookEditor';
import { useBooksStore } from '../store';
import { useBookUIStore } from '../ui/store';
let create: jest.SpyInstance;
beforeEach(() => { useBooksStore.setState({ isManaging: false, books: [] }); create = jest.spyOn(useBooksStore.getState(), 'addBook').mockResolvedValue('new'); useBookUIStore.getState().open('create'); });
afterEach(() => jest.restoreAllMocks());
it('submits a trimmed name, curated currency, signed exact balance and timezone', async () => {
  render(<BookEditor />);
  fireEvent.changeText(screen.getByLabelText('Book name'), '  Debt  ');
  fireEvent.press(screen.getByLabelText('Currency USD')); fireEvent.press(screen.getByLabelText('Use KWD'));
  fireEvent.changeText(screen.getByLabelText('Opening balance'), '-1.234');
  fireEvent.press(screen.getByText('Create book'));
  await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Debt', currencyCode: 'KWD', openingBalanceMinor: -1234, timezone: expect.any(String) })));
});
it('keeps entered data and reports server rejection', async () => {
  create.mockRejectedValueOnce({ isAxiosError: true, response: { status: 400, data: { error: { code: 'VALIDATION_ERROR', message: 'Server rejected this name' } } } });
  render(<BookEditor />); fireEvent.changeText(screen.getByLabelText('Book name'), 'Personal'); fireEvent.press(screen.getByText('Create book'));
  await waitFor(() => expect(screen.getByText('Server rejected this name')).toBeTruthy());
  expect(screen.getByLabelText('Book name').props.value).toBe('Personal');
});
it('rejects whitespace and 81 characters, allows 80', async () => {
  render(<BookEditor />);
  for (const name of ['   ', 'a'.repeat(81)]) { fireEvent.changeText(screen.getByLabelText('Book name'), name); fireEvent.press(screen.getByText('Create book')); }
  expect(create).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText('Book name'), 'a'.repeat(80)); fireEvent.press(screen.getByText('Create book'));
  await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
});
