import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CurrencyInput from './CurrencyInput';

// Smoke test for the test runner itself + a real component contract.
// CurrencyInput is the input every money field in the app uses, so a
// regression here would silently break transaction entry.

describe('CurrencyInput', () => {
    it('renders an empty input when value is undefined', () => {
        render(<CurrencyInput name="amount" onChange={() => {}} placeholder="Enter amount" />);
        const input = screen.getByPlaceholderText('Enter amount');
        expect(input).toBeInTheDocument();
        expect(input).toHaveValue('');
    });

    it('formats incoming numeric value with thousands separators', () => {
        render(<CurrencyInput name="amount" value={1234567} onChange={() => {}} placeholder="amt" />);
        expect(screen.getByPlaceholderText('amt')).toHaveValue('1,234,567');
    });

    it('emits raw (unformatted) value to onChange while displaying formatted value', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<CurrencyInput name="amount" onChange={onChange} placeholder="amt" />);
        const input = screen.getByPlaceholderText('amt');

        await user.type(input, '1234');

        // Displayed value carries the comma after the 4th keystroke.
        expect(input).toHaveValue('1,234');

        // Parent receives the raw, unformatted string for state storage.
        const lastCall = onChange.mock.calls.at(-1)[0];
        expect(lastCall.target.name).toBe('amount');
        expect(lastCall.target.value).toBe('1234');
    });

    it('rejects non-numeric input', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<CurrencyInput name="amount" onChange={onChange} placeholder="amt" />);
        const input = screen.getByPlaceholderText('amt');

        await user.type(input, 'abc');

        expect(input).toHaveValue('');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('accepts a single decimal point', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<CurrencyInput name="amount" onChange={onChange} placeholder="amt" />);
        const input = screen.getByPlaceholderText('amt');

        await user.type(input, '99.5');

        expect(input).toHaveValue('99.5');
        expect(onChange.mock.calls.at(-1)[0].target.value).toBe('99.5');
    });

    it('forwards required and id props to the underlying input', () => {
        render(<CurrencyInput name="amount" id="amt-field" required onChange={() => {}} />);
        const input = document.getElementById('amt-field');
        expect(input).toBeRequired();
    });
});
