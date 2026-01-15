import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FieldText } from '../field-text';

describe('FieldText', () => {
  it('renders correctly', () => {
    render(<FieldText id='test-input' />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('renders with correct id', () => {
    render(<FieldText id='custom-id' />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'custom-id');
  });

  it('renders with type text', () => {
    render(<FieldText id='test-input' />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('renders with default classes', () => {
    render(<FieldText id='test-input' />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('passflow-field-input');
    expect(input).toHaveClass('passflow-field--focused');
  });

  it('applies custom className', () => {
    render(<FieldText id='test-input' className='custom-class' />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });

  it('applies error class when isError is true', () => {
    render(<FieldText id='test-input' isError={true} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('passflow-field--error');
  });

  it('does not apply error class when isError is false', () => {
    render(<FieldText id='test-input' isError={false} />);
    const input = screen.getByRole('textbox');
    expect(input).not.toHaveClass('passflow-field--error');
  });

  it('handles disabled state', () => {
    render(<FieldText id='test-input' disabled={true} />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('is enabled by default', () => {
    render(<FieldText id='test-input' />);
    const input = screen.getByRole('textbox');
    expect(input).not.toBeDisabled();
  });

  it('handles value changes', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<FieldText id='test-input' onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'Hello');

    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('Hello');
  });

  it('renders with initial value', () => {
    render(<FieldText id='test-input' value='Initial value' onChange={vi.fn()} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Initial value');
  });

  it('renders with placeholder', () => {
    render(<FieldText id='test-input' placeholder='Enter text here' />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Enter text here');
  });

  it('forwards additional HTML attributes', () => {
    render(<FieldText id='test-input' data-testid='custom-input' aria-label='Custom Input' />);

    const input = screen.getByTestId('custom-input');
    expect(input).toHaveAttribute('aria-label', 'Custom Input');
  });

  it('accepts maxLength attribute', () => {
    render(<FieldText id='test-input' maxLength={10} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('maxLength', '10');
  });

  it('accepts required attribute', () => {
    render(<FieldText id='test-input' required />);
    const input = screen.getByRole('textbox');
    expect(input).toBeRequired();
  });

  it('accepts readOnly attribute', () => {
    render(<FieldText id='test-input' readOnly />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('readOnly');
  });

  it('accepts autoComplete attribute', () => {
    render(<FieldText id='test-input' autoComplete='email' />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('autoComplete', 'email');
  });

  it('handles onBlur event', async () => {
    const handleBlur = vi.fn();
    const user = userEvent.setup();

    render(<FieldText id='test-input' onBlur={handleBlur} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.tab();

    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it('handles onFocus event', async () => {
    const handleFocus = vi.fn();
    const user = userEvent.setup();

    render(<FieldText id='test-input' onFocus={handleFocus} />);

    const input = screen.getByRole('textbox');
    await user.click(input);

    expect(handleFocus).toHaveBeenCalledTimes(1);
  });

  it('can be cleared', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<FieldText id='test-input' onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'Test');
    await user.clear(input);

    expect(input).toHaveValue('');
  });

  it('supports ref forwarding', () => {
    const ref = vi.fn();
    render(<FieldText id='test-input' ref={ref} />);

    expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement));
  });

  it('renders with multiple classes combined', () => {
    render(<FieldText id='test-input' isError={true} className='custom-class' />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('passflow-field-input');
    expect(input).toHaveClass('passflow-field--focused');
    expect(input).toHaveClass('passflow-field--error');
    expect(input).toHaveClass('custom-class');
  });

  it('does not allow typing when disabled', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<FieldText id='test-input' disabled onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'Test');

    expect(handleChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('');
  });
});
