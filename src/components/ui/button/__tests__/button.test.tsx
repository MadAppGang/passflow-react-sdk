import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../index';

describe('Button', () => {
  it('renders correctly with children', () => {
    render(
      <Button size='medium' variant='primary' type='button'>
        Click me
      </Button>,
    );
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('renders with primary variant', () => {
    render(
      <Button size='medium' variant='primary' type='button'>
        Primary Button
      </Button>,
    );
    const button = screen.getByText('Primary Button');
    expect(button).toHaveClass('passflow-button--primary');
  });

  it('renders with outlined variant', () => {
    render(
      <Button size='medium' variant='outlined' type='button'>
        Outlined Button
      </Button>,
    );
    const button = screen.getByText('Outlined Button');
    expect(button).toHaveClass('passflow-button--outlined');
  });

  it('renders with dark variant', () => {
    render(
      <Button size='medium' variant='dark' type='button'>
        Dark Button
      </Button>,
    );
    const button = screen.getByText('Dark Button');
    expect(button).toHaveClass('passflow-button--dark');
  });

  it('renders with clean variant', () => {
    render(
      <Button size='medium' variant='clean' type='button'>
        Clean Button
      </Button>,
    );
    const button = screen.getByText('Clean Button');
    expect(button).toHaveClass('passflow-button--clean');
  });

  it('renders with secondary variant', () => {
    render(
      <Button size='medium' variant='secondary' type='button'>
        Secondary Button
      </Button>,
    );
    const button = screen.getByText('Secondary Button');
    expect(button).toHaveClass('passflow-button--secondary');
  });

  it('renders with warning variant', () => {
    render(
      <Button size='medium' variant='warning' type='button'>
        Warning Button
      </Button>,
    );
    const button = screen.getByText('Warning Button');
    expect(button).toHaveClass('passflow-button--warning');
  });

  it('renders with provider variant', () => {
    render(
      <Button size='medium' variant='provider' type='button'>
        Provider Button
      </Button>,
    );
    const button = screen.getByText('Provider Button');
    expect(button).toHaveClass('passflow-button--provider');
  });

  it('renders with small size', () => {
    render(
      <Button size='small' variant='primary' type='button'>
        Small Button
      </Button>,
    );
    const button = screen.getByText('Small Button');
    expect(button).toHaveClass('passflow-button--small');
  });

  it('renders with medium size', () => {
    render(
      <Button size='medium' variant='primary' type='button'>
        Medium Button
      </Button>,
    );
    const button = screen.getByText('Medium Button');
    expect(button).toHaveClass('passflow-button--medium');
  });

  it('renders with big size', () => {
    render(
      <Button size='big' variant='primary' type='button'>
        Big Button
      </Button>,
    );
    const button = screen.getByText('Big Button');
    expect(button).toHaveClass('passflow-button--big');
  });

  it('applies withIcon class when withIcon is true', () => {
    render(
      <Button size='medium' variant='primary' type='button' withIcon>
        With Icon
      </Button>,
    );
    const button = screen.getByText('With Icon');
    expect(button).toHaveClass('passflow-button--with-icon');
  });

  it('applies asIcon class when asIcon is true', () => {
    render(
      <Button size='medium' variant='primary' type='button' asIcon>
        As Icon
      </Button>,
    );
    const button = screen.getByText('As Icon');
    expect(button).toHaveClass('passflow-button--as-icon');
  });

  it('applies custom className', () => {
    render(
      <Button size='medium' variant='primary' type='button' className='custom-class'>
        Custom Class
      </Button>,
    );
    const button = screen.getByText('Custom Class');
    expect(button).toHaveClass('custom-class');
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button size='medium' variant='primary' type='button' onClick={handleClick}>
        Click me
      </Button>,
    );

    await user.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('respects disabled state', () => {
    const handleClick = vi.fn();
    render(
      <Button size='medium' variant='primary' type='button' onClick={handleClick} disabled>
        Disabled Button
      </Button>,
    );

    const button = screen.getByText('Disabled Button');
    expect(button).toBeDisabled();
  });

  it('renders ripple container when withRipple is true (default)', () => {
    render(
      <Button size='medium' variant='primary' type='button'>
        Ripple Button
      </Button>,
    );

    const button = screen.getByText('Ripple Button');
    const rippleContainer = button.querySelector('.passflow-ripple-container');
    expect(rippleContainer).toBeInTheDocument();
  });

  it('does not render ripple container when withRipple is false', () => {
    render(
      <Button size='medium' variant='primary' type='button' withRipple={false}>
        No Ripple Button
      </Button>,
    );

    const button = screen.getByText('No Ripple Button');
    const rippleContainer = button.querySelector('.passflow-ripple-container');
    expect(rippleContainer).not.toBeInTheDocument();
  });

  it('creates ripple effect on click', async () => {
    const user = userEvent.setup();

    render(
      <Button size='medium' variant='primary' type='button'>
        Ripple Test
      </Button>,
    );

    const button = screen.getByText('Ripple Test');
    await user.click(button);

    const rippleContainer = button.querySelector('.passflow-ripple-container');
    expect(rippleContainer).toBeInTheDocument();

    // Check if ripple element is created
    const ripple = rippleContainer?.querySelector('.passflow-ripple');
    expect(ripple).toBeInTheDocument();
  });

  it('clears ripples after timeout', async () => {
    const user = userEvent.setup();

    render(
      <Button size='medium' variant='primary' type='button'>
        Ripple Timeout Test
      </Button>,
    );

    const button = screen.getByText('Ripple Timeout Test');
    const rippleContainer = button.querySelector('.passflow-ripple-container');

    // Click to create ripple
    await user.click(button);

    // Verify ripple is created
    expect(rippleContainer?.querySelector('.passflow-ripple')).toBeInTheDocument();

    // Wait for ripple to be cleared (1000ms timeout in component + buffer)
    await waitFor(
      () => {
        expect(rippleContainer?.querySelector('.passflow-ripple')).not.toBeInTheDocument();
      },
      { timeout: 1500 },
    );
  });

  it('renders with correct button type', () => {
    const { rerender } = render(
      <Button size='medium' variant='primary' type='button'>
        Button Type
      </Button>,
    );
    expect(screen.getByText('Button Type')).toHaveAttribute('type', 'button');

    rerender(
      <Button size='medium' variant='primary' type='submit'>
        Button Type
      </Button>,
    );
    expect(screen.getByText('Button Type')).toHaveAttribute('type', 'submit');

    rerender(
      <Button size='medium' variant='primary' type='reset'>
        Button Type
      </Button>,
    );
    expect(screen.getByText('Button Type')).toHaveAttribute('type', 'reset');
  });

  it('forwards additional HTML attributes', () => {
    render(
      <Button size='medium' variant='primary' type='button' data-testid='custom-button' aria-label='Custom Button'>
        Custom Attributes
      </Button>,
    );

    const button = screen.getByTestId('custom-button');
    expect(button).toHaveAttribute('aria-label', 'Custom Button');
  });
});
