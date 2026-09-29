import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CategoryDonut, donutShares } from '../components/CategoryDonut';
const entry = (id: string, amount: number) => ({ id, name: id, amount, color: '#16A34A' });
it('calculates shares and excludes zero or invalid amounts', () => {
  expect(donutShares([entry('a', 75), entry('b', 25), entry('empty', 0), entry('invalid', NaN)]).map(e => e.share)).toEqual([.75, .25]);
  expect(donutShares([])).toEqual([]);
});
it('normalizes large totals without overflowing', () => {
  expect(donutShares([entry('a', Number.MAX_VALUE), entry('b', Number.MAX_VALUE)]).map(e => e.share)).toEqual([.5, .5]);
});
it('exposes the category breakdown without relying on colors', () => {
  render(<CategoryDonut label="Income" entries={[entry('Salary', 75), entry('Other', 25)]} />);
  expect(screen.getByRole('image').props.accessibilityLabel).toContain('Salary: 75.0 percent');
});
