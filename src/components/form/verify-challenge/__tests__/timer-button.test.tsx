import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimerButton } from '../timer-button';

describe('TimerButton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial rendering', () => {
    it('renders with initial countdown', () => {
      const onClick = vi.fn();
      render(<TimerButton totalSecond={30} onClick={onClick} />);

      expect(screen.getByRole('button')).toHaveTextContent('Resend (30)');
    });

    it('is disabled during countdown', () => {
      const onClick = vi.fn();
      render(<TimerButton totalSecond={30} onClick={onClick} />);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('has active class during countdown', () => {
      const onClick = vi.fn();
      render(<TimerButton totalSecond={10} onClick={onClick} />);

      expect(screen.getByRole('button')).toHaveClass('passflow-button-timer--active');
    });

    it('applies custom className', () => {
      const onClick = vi.fn();
      render(<TimerButton totalSecond={10} onClick={onClick} className="custom-timer" />);

      expect(screen.getByRole('button')).toHaveClass('custom-timer');
    });
  });

  describe('countdown behavior', () => {
    it('decrements countdown every second', () => {
      const onClick = vi.fn();
      render(<TimerButton totalSecond={5} onClick={onClick} />);

      expect(screen.getByRole('button')).toHaveTextContent('Resend (5)');

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByRole('button')).toHaveTextContent('Resend (4)');

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByRole('button')).toHaveTextContent('Resend (3)');
    });

    it('enables button when countdown reaches 0', () => {
      const onClick = vi.fn();
      render(<TimerButton totalSecond={2} onClick={onClick} />);

      expect(screen.getByRole('button')).toBeDisabled();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('shows only "Resend" text when countdown reaches 0', () => {
      const onClick = vi.fn();
      render(<TimerButton totalSecond={1} onClick={onClick} />);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByRole('button')).toHaveTextContent('Resend');
      expect(screen.getByRole('button').textContent).not.toMatch(/\(\d+\)/);
    });

    it('has inactive class when countdown is 0', () => {
      const onClick = vi.fn();
      render(<TimerButton totalSecond={1} onClick={onClick} />);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByRole('button')).toHaveClass('passflow-button-timer--inactive');
    });

    it('stops decrementing at 0', () => {
      const onClick = vi.fn();
      render(<TimerButton totalSecond={1} onClick={onClick} />);

      act(() => {
        vi.advanceTimersByTime(5000); // Advance more than needed
      });

      // Should still show Resend without negative numbers
      expect(screen.getByRole('button')).toHaveTextContent('Resend');
    });
  });

  describe('click behavior', () => {
    it('calls onClick when button is clicked', () => {
      const onClick = vi.fn();
      render(<TimerButton totalSecond={1} onClick={onClick} />);

      // Wait for countdown to finish
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      fireEvent.click(screen.getByRole('button'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('resets countdown when button is clicked', () => {
      const onClick = vi.fn();
      render(<TimerButton totalSecond={5} onClick={onClick} />);

      // Wait for countdown to finish
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByRole('button')).toHaveTextContent('Resend');

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByRole('button')).toHaveTextContent('Resend (5)');
    });

    it('disables button after click', () => {
      const onClick = vi.fn();
      render(<TimerButton totalSecond={3} onClick={onClick} />);

      // Wait for countdown to finish
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('does not call onClick when button is disabled', () => {
      const onClick = vi.fn();
      render(<TimerButton totalSecond={10} onClick={onClick} />);

      // Button is disabled, clicking should not trigger onClick
      fireEvent.click(screen.getByRole('button'));

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('different timer values', () => {
    it('handles zero initial value', () => {
      const onClick = vi.fn();
      render(<TimerButton totalSecond={0} onClick={onClick} />);

      expect(screen.getByRole('button')).not.toBeDisabled();
      expect(screen.getByRole('button')).toHaveTextContent('Resend');
    });

    it('handles large timer value', () => {
      const onClick = vi.fn();
      render(<TimerButton totalSecond={60} onClick={onClick} />);

      expect(screen.getByRole('button')).toHaveTextContent('Resend (60)');
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('handles 1 second timer', () => {
      const onClick = vi.fn();
      render(<TimerButton totalSecond={1} onClick={onClick} />);

      expect(screen.getByRole('button')).toHaveTextContent('Resend (1)');

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByRole('button')).toHaveTextContent('Resend');
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  describe('button attributes', () => {
    it('is a button type', () => {
      const onClick = vi.fn();
      render(<TimerButton totalSecond={10} onClick={onClick} />);

      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('has passflow-button-timer class', () => {
      const onClick = vi.fn();
      render(<TimerButton totalSecond={10} onClick={onClick} />);

      expect(screen.getByRole('button')).toHaveClass('passflow-button-timer');
    });
  });

  describe('cleanup', () => {
    it('clears interval on unmount', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      const onClick = vi.fn();
      const { unmount } = render(<TimerButton totalSecond={10} onClick={onClick} />);

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });
});
