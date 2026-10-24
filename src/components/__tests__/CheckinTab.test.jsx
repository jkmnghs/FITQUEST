// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import CheckinTab from '../CheckinTab';

afterEach(cleanup);

function setup(stateOverrides = {}) {
  const onSubmit = vi.fn();
  const state = {
    unit: 'kg',
    currentWeek: 1,
    weeklyCheckins: [],
    assessment: { heightCm: 180 },
    ...stateOverrides,
  };
  render(<CheckinTab state={state} onSubmit={onSubmit} />);
  return { onSubmit };
}

function fillAndSave({ weight, waist }) {
  fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: weight } });
  fireEvent.change(screen.getByLabelText(/waist/i), { target: { value: waist } });
  fireEvent.click(screen.getByRole('button', { name: /save check-in/i }));
}

describe('CheckinTab waist validation', () => {
  it('saves a check-in with a plausible waist in cm', () => {
    const { onSubmit } = setup();
    fillAndSave({ weight: '80', waist: '86' });
    expect(onSubmit).toHaveBeenCalledWith(80, 86, 0);
    expect(screen.getByText(/check-in saved/i)).toBeTruthy();
  });

  it('rejects an inches-sized waist with the height-based range', () => {
    const { onSubmit } = setup();
    fillAndSave({ weight: '80', waist: '32' });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Enter 55–250 cm, or leave blank\./)).toBeTruthy();
  });

  it('falls back to 170cm height when no assessment height is set', () => {
    const { onSubmit } = setup({ assessment: {} });
    fillAndSave({ weight: '80', waist: '50' });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Enter 55–250 cm/)).toBeTruthy();
  });
});
