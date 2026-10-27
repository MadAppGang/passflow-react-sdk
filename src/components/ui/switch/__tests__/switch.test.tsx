import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from '../index';

describe('Switch', () => {
  it('renders correctly with label', () => {
    const handleChange = vi.fn();
    render(<Switch label='Enable notifications' checked={false} onChange={handleChange} />);

    expect(screen.getByText('Enable notifications')).toBeInTheDocument();
  });

  it('renders checkbox input', () => {
    const handleChange = vi.fn();
    render(<Switch label='Test Switch' checked={false} onChange={handleChange} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('type', 'checkbox');
  });

  it('renders with an id', () => {
    const handleChange = vi.fn();
    render(<Switch label='Test Switch' checked={false} onChange={handleChange} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.getAttribute('id')).toBeTruthy();
  });

  it('honours an explicit id', () => {
    const handleChange = vi.fn();
    render(<Switch label='Test Switch' checked={false} id='scope-profile' onChange={handleChange} />);

    expect(screen.getByRole('checkbox')).toHaveAttribute('id', 'scope-profile');
  });

  it('gives each switch a unique id so labels do not collide', () => {
    const handleChange = vi.fn();
    render(
      <>
        <Switch label='First' checked={false} onChange={handleChange} />
        <Switch label='Second' checked={false} onChange={handleChange} />
      </>,
    );

    const [first, second] = screen.getAllByRole('checkbox');
    expect(first.getAttribute('id')).toBeTruthy();
    expect(first.getAttribute('id')).not.toBe(second.getAttribute('id'));
  });

  it('renders unchecked state correctly', () => {
    const handleChange = vi.fn();
    render(<Switch label='Test Switch' checked={false} onChange={handleChange} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('renders checked state correctly', () => {
    const handleChange = vi.fn();
    render(<Switch label='Test Switch' checked={true} onChange={handleChange} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('calls onChange handler when clicked', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Switch label='Test Switch' checked={false} onChange={handleChange} />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('calls onChange with event object', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Switch label='Test Switch' checked={false} onChange={handleChange} />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.any(Object),
      }),
    );

    // Verify the event has the expected structure
    const callArg = handleChange.mock.calls[0]?.[0];
    expect(callArg.target.type).toBe('checkbox');
  });

  it('toggles from unchecked to checked', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Switch label='Test Switch' checked={false} onChange={handleChange} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('toggles from checked to unchecked', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Switch label='Test Switch' checked={true} onChange={handleChange} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();

    await user.click(checkbox);

    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('renders wrapper with correct class', () => {
    const handleChange = vi.fn();
    const { container } = render(<Switch label='Test Switch' checked={false} onChange={handleChange} />);

    const wrapper = container.querySelector('.passflow-switch-wrapper');
    expect(wrapper).toBeInTheDocument();
  });

  it('renders label with correct class', () => {
    const handleChange = vi.fn();
    const { container } = render(<Switch label='Test Switch' checked={false} onChange={handleChange} />);

    const label = container.querySelector('.passflow-switch-label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('Test Switch');
  });

  it('renders input with correct class', () => {
    const handleChange = vi.fn();
    const { container } = render(<Switch label='Test Switch' checked={false} onChange={handleChange} />);

    const input = container.querySelector('.passflow-switch-input');
    expect(input).toBeInTheDocument();
  });

  it('renders track with correct class', () => {
    const handleChange = vi.fn();
    const { container } = render(<Switch label='Test Switch' checked={false} onChange={handleChange} />);

    const track = container.querySelector('.passflow-switch-track');
    expect(track).toBeInTheDocument();
  });

  it('associates label with checkbox via htmlFor', () => {
    const handleChange = vi.fn();
    const { container } = render(<Switch label='Test Switch' checked={false} onChange={handleChange} />);

    const label = container.querySelector('label');
    const checkbox = screen.getByRole('checkbox');
    expect(label).toHaveAttribute('for', checkbox.getAttribute('id'));
  });

  it('can be clicked via label', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Switch label='Test Switch' checked={false} onChange={handleChange} />);

    const label = screen.getByText('Test Switch');
    await user.click(label);

    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('handles multiple clicks', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Switch label='Test Switch' checked={false} onChange={handleChange} />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    await user.click(checkbox);
    await user.click(checkbox);

    expect(handleChange).toHaveBeenCalledTimes(3);
  });

  it('renders with different label text', () => {
    const handleChange = vi.fn();
    render(<Switch label='Custom Label Text' checked={false} onChange={handleChange} />);

    expect(screen.getByText('Custom Label Text')).toBeInTheDocument();
  });
});
