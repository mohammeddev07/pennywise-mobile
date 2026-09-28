import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { SegmentedControl } from '../components/SegmentedControl';
it('keeps rapid calm-toggle changes responsive and exposes selection', () => {
  function Toggle() {
    const [value, setValue] = React.useState('Months');
    return <SegmentedControl motion="calm" value={value} onChange={setValue} items={['Months', 'Years'].map(label => ({label, value: label}))} />;
  }
  render(<Toggle />);
  fireEvent.press(screen.getByText('Years'));
  expect(screen.getByRole('button', {name: 'Years'}).props.accessibilityState.selected).toBe(true);
  fireEvent.press(screen.getByText('Months'));
  expect(screen.getByRole('button', {name: 'Months'}).props.accessibilityState.selected).toBe(true);
});
