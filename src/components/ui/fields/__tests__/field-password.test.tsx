import type { PassflowPasswordPolicySettings } from '@passflow/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FieldPassword } from '../field-password';

const defaultPasswordPolicy: PassflowPasswordPolicySettings = {
  restrict_min_password_length: true,
  min_password_length: 8,
  reject_compromised: false,
  enforce_password_strength: 'none',
  require_lowercase: true,
  require_uppercase: true,
  require_number: true,
  require_symbol: true,
};

describe('FieldPassword', () => {
  it('renders correctly with password policy', () => {
    render(<FieldPassword id='test-password' value='' passwordPolicy={defaultPasswordPolicy} onChange={vi.fn()} />);
    const input = document.getElementById('test-password');
    expect(input).toBeInTheDocument();
  });

  it('returns null when passwordPolicy is null', () => {
    const { container } = render(<FieldPassword id='test-password' value='' passwordPolicy={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders with correct id', () => {
    render(<FieldPassword id='custom-id' value='' passwordPolicy={defaultPasswordPolicy} onChange={vi.fn()} />);
    const input = document.getElementById('custom-id');
    expect(input).toHaveAttribute('id', 'custom-id');
  });

  it('starts with password type (hidden)', () => {
    render(<FieldPassword id='test-password' value='' passwordPolicy={defaultPasswordPolicy} onChange={vi.fn()} />);
    const input = document.getElementById('test-password');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('toggles password visibility on button click', async () => {
    const user = userEvent.setup();

    render(<FieldPassword id='test-password' value='' passwordPolicy={defaultPasswordPolicy} onChange={vi.fn()} />);

    const input = document.getElementById('test-password');
    expect(input).toHaveAttribute('type', 'password');

    // Click the toggle button
    const toggleButton = screen.getByRole('button');
    await user.click(toggleButton);

    expect(input).toHaveAttribute('type', 'text');

    // Click again to hide
    await user.click(toggleButton);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('renders eye-off icon when password is hidden', () => {
    const { container } = render(
      <FieldPassword id='test-password' value='' passwordPolicy={defaultPasswordPolicy} onChange={vi.fn()} />,
    );
    const eyeOffIcon = container.querySelector('img[alt="eye-off"]');
    expect(eyeOffIcon).toBeInTheDocument();
  });

  it('renders eye-on icon when password is visible', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <FieldPassword id='test-password' value='' passwordPolicy={defaultPasswordPolicy} onChange={vi.fn()} />,
    );

    const toggleButton = screen.getByRole('button');
    await user.click(toggleButton);

    const eyeOnIcon = container.querySelector('img[alt="eye-on"]');
    expect(eyeOnIcon).toBeInTheDocument();
  });

  it('renders with default classes', () => {
    render(<FieldPassword id='test-password' value='' passwordPolicy={defaultPasswordPolicy} onChange={vi.fn()} />);
    const input = document.getElementById('test-password');
    expect(input).toHaveClass('passflow-field-input');
    expect(input).toHaveClass('passflow-field--focused');
    expect(input).toHaveClass('passflow-field-input--with-icon');
  });

  it('applies custom className', () => {
    render(
      <FieldPassword
        id='test-password'
        value=''
        passwordPolicy={defaultPasswordPolicy}
        className='custom-class'
        onChange={vi.fn()}
      />,
    );
    const input = document.getElementById('test-password');
    expect(input).toHaveClass('custom-class');
  });

  it('applies error class when isError is true', () => {
    render(
      <FieldPassword id='test-password' value='' passwordPolicy={defaultPasswordPolicy} isError={true} onChange={vi.fn()} />,
    );
    const input = document.getElementById('test-password');
    expect(input).toHaveClass('passflow-field--error');
  });

  it('handles disabled state', () => {
    render(
      <FieldPassword id='test-password' value='' passwordPolicy={defaultPasswordPolicy} disabled={true} onChange={vi.fn()} />,
    );
    const input = document.getElementById('test-password');
    expect(input).toBeDisabled();
  });

  it('renders with value', () => {
    render(<FieldPassword id='test-password' value='test123' passwordPolicy={defaultPasswordPolicy} onChange={vi.fn()} />);
    const input = document.getElementById('test-password');
    expect(input).toHaveValue('test123');
  });

  it('handles value changes', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<FieldPassword id='test-password' value='' passwordPolicy={defaultPasswordPolicy} onChange={handleChange} />);

    const input = document.getElementById('test-password')!;
    await user.type(input, 'P');

    expect(handleChange).toHaveBeenCalled();
  });

  it('displays validation messages when withMessages is true', () => {
    render(
      <FieldPassword
        id='test-password'
        value=''
        passwordPolicy={defaultPasswordPolicy}
        withMessages={true}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/At least 8 characters/i)).toBeInTheDocument();
  });

  it('does not display validation messages when withMessages is false', () => {
    render(
      <FieldPassword
        id='test-password'
        value=''
        passwordPolicy={defaultPasswordPolicy}
        withMessages={false}
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByText(/At least 8 characters/i)).not.toBeInTheDocument();
  });

  it('displays minimum password length from policy', () => {
    const customPolicy = { ...defaultPasswordPolicy, min_password_length: 12 };
    render(<FieldPassword id='test-password' value='' passwordPolicy={customPolicy} withMessages={true} onChange={vi.fn()} />);

    expect(screen.getByText(/At least 12 characters/i)).toBeInTheDocument();
  });

  it('displays validation message for character requirements', () => {
    render(
      <FieldPassword
        id='test-password'
        value=''
        passwordPolicy={defaultPasswordPolicy}
        withMessages={true}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Contain a number, symbol, lowercase letter, and uppercase letter/i)).toBeInTheDocument();
  });

  it('shows success icon for length when valid', () => {
    const { container } = render(
      <FieldPassword
        id='test-password'
        value='12345678'
        passwordPolicy={defaultPasswordPolicy}
        withMessages={true}
        validationErrors={['uppercase', 'lowercase', 'number', 'symbol']}
      />,
    );

    const validationItems = container.querySelectorAll('.passflow-password-validation-item');
    const lengthItem = validationItems[0]!;
    const checkIcon = lengthItem.querySelector('img[alt="check"]');
    expect(checkIcon).toBeInTheDocument();
  });

  it('shows close icon for length when invalid', () => {
    const { container } = render(
      <FieldPassword
        id='test-password'
        value='123'
        passwordPolicy={defaultPasswordPolicy}
        withMessages={true}
        validationErrors={['length', 'uppercase', 'lowercase', 'number', 'symbol']}
      />,
    );

    const validationItems = container.querySelectorAll('.passflow-password-validation-item');
    const lengthItem = validationItems[0]!;
    const closeIcon = lengthItem.querySelector('img[alt="close"]');
    expect(closeIcon).toBeInTheDocument();
  });

  it('applies success class when validation passes', () => {
    const { container } = render(
      <FieldPassword
        id='test-password'
        value='12345678'
        passwordPolicy={defaultPasswordPolicy}
        withMessages={true}
        validationErrors={['uppercase', 'lowercase', 'number', 'symbol']}
      />,
    );

    const validationItems = container.querySelectorAll('.passflow-password-validation-item');
    const lengthItem = validationItems[0];
    expect(lengthItem).toHaveClass('passflow-password-validation-item--success');
  });

  it('renders toggle button with clean variant', () => {
    const { container } = render(<FieldPassword id='test-password' value='' passwordPolicy={defaultPasswordPolicy} />);
    const toggleButton = container.querySelector('.passflow-button--clean');
    expect(toggleButton).toBeInTheDocument();
  });

  it('renders toggle button with asIcon and withIcon props', () => {
    const { container } = render(<FieldPassword id='test-password' value='' passwordPolicy={defaultPasswordPolicy} />);
    const toggleButton = container.querySelector('.passflow-button--as-icon');
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveClass('passflow-button--with-icon');
  });

  it('forwards additional HTML attributes', () => {
    render(
      <FieldPassword
        id='test-password'
        value=''
        passwordPolicy={defaultPasswordPolicy}
        data-testid='custom-password'
        aria-label='Custom Password'
      />,
    );

    const input = screen.getByTestId('custom-password');
    expect(input).toHaveAttribute('aria-label', 'Custom Password');
  });

  it('supports ref forwarding', () => {
    const ref = vi.fn();
    render(<FieldPassword id='test-password' value='' passwordPolicy={defaultPasswordPolicy} ref={ref} />);

    expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement));
  });

  it('generates correct message for partial requirements', () => {
    const partialPolicy: PassflowPasswordPolicySettings = {
      restrict_min_password_length: true,
      min_password_length: 8,
      reject_compromised: false,
      enforce_password_strength: 'none',
      require_lowercase: true,
      require_uppercase: false,
      require_number: true,
      require_symbol: false,
    };

    render(<FieldPassword id='test-password' value='' passwordPolicy={partialPolicy} withMessages={true} />);

    expect(screen.getByText(/Contain a number and lowercase letter/i)).toBeInTheDocument();
  });

  it('generates correct message for single requirement', () => {
    const singleReqPolicy: PassflowPasswordPolicySettings = {
      restrict_min_password_length: true,
      min_password_length: 8,
      reject_compromised: false,
      enforce_password_strength: 'none',
      require_lowercase: false,
      require_uppercase: false,
      require_number: true,
      require_symbol: false,
    };

    render(<FieldPassword id='test-password' value='' passwordPolicy={singleReqPolicy} withMessages={true} />);

    expect(screen.getByText(/Contain a number/i)).toBeInTheDocument();
  });

  it('renders field wrapper with correct class', () => {
    const { container } = render(<FieldPassword id='test-password' value='' passwordPolicy={defaultPasswordPolicy} />);
    const wrapper = container.querySelector('.passflow-field-wrapper');
    expect(wrapper).toBeInTheDocument();
  });

  it('does not show success styling when value is empty', () => {
    const { container } = render(
      <FieldPassword
        id='test-password'
        value=''
        passwordPolicy={defaultPasswordPolicy}
        withMessages={true}
        validationErrors={[]}
      />,
    );

    const successItems = container.querySelectorAll('.passflow-password-validation-item--success');
    expect(successItems).toHaveLength(0);
  });

  it('accepts placeholder attribute', () => {
    render(
      <FieldPassword
        id='test-password'
        value=''
        passwordPolicy={defaultPasswordPolicy}
        placeholder='Enter password'
        onChange={vi.fn()}
      />,
    );
    const input = document.getElementById('test-password');
    expect(input).toHaveAttribute('placeholder', 'Enter password');
  });

  it('toggle button does not submit form', () => {
    render(<FieldPassword id='test-password' value='' passwordPolicy={defaultPasswordPolicy} />);
    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toHaveAttribute('type', 'button');
  });
});
