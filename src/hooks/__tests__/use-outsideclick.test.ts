import { renderHook } from '@testing-library/react';
import { type RefObject, useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOutsideClick } from '../use-outsideclick';

describe('useOutsideClick', () => {
  let container: HTMLDivElement;
  let targetElement: HTMLDivElement;
  let outsideElement: HTMLDivElement;

  beforeEach(() => {
    // Set up DOM elements
    container = document.createElement('div');
    targetElement = document.createElement('div');
    targetElement.setAttribute('data-testid', 'target');
    outsideElement = document.createElement('div');
    outsideElement.setAttribute('data-testid', 'outside');

    container.appendChild(targetElement);
    container.appendChild(outsideElement);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.clearAllMocks();
  });

  const createRefWrapper = (element: HTMLElement | null) => {
    return () => {
      const ref = useRef<HTMLDivElement>(element as HTMLDivElement);
      return ref;
    };
  };

  it('calls callback when clicking outside the element', () => {
    const onClickOutside = vi.fn();

    const { result: refResult } = renderHook(createRefWrapper(targetElement));

    renderHook(() => useOutsideClick(refResult.current, onClickOutside));

    // Click outside the target element
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    outsideElement.dispatchEvent(clickEvent);

    expect(onClickOutside).toHaveBeenCalledTimes(1);
  });

  it('does not call callback when clicking inside the element', () => {
    const onClickOutside = vi.fn();

    const { result: refResult } = renderHook(createRefWrapper(targetElement));

    renderHook(() => useOutsideClick(refResult.current, onClickOutside));

    // Click inside the target element
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    targetElement.dispatchEvent(clickEvent);

    expect(onClickOutside).not.toHaveBeenCalled();
  });

  it('does not call callback when clicking a child of the element', () => {
    const onClickOutside = vi.fn();
    const childElement = document.createElement('span');
    targetElement.appendChild(childElement);

    const { result: refResult } = renderHook(createRefWrapper(targetElement));

    renderHook(() => useOutsideClick(refResult.current, onClickOutside));

    // Click child element
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    childElement.dispatchEvent(clickEvent);

    expect(onClickOutside).not.toHaveBeenCalled();
  });

  it('handles undefined callback gracefully', () => {
    const { result: refResult } = renderHook(createRefWrapper(targetElement));

    // Should not throw
    renderHook(() => useOutsideClick(refResult.current, undefined));

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    outsideElement.dispatchEvent(clickEvent);

    // No error should occur
  });

  it('handles null ref.current gracefully', () => {
    const onClickOutside = vi.fn();
    const nullRef = { current: null } as RefObject<HTMLDivElement>;

    renderHook(() => useOutsideClick(nullRef, onClickOutside));

    // Click anywhere
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    outsideElement.dispatchEvent(clickEvent);

    // Should not call callback when ref is null
    expect(onClickOutside).not.toHaveBeenCalled();
  });

  it('removes event listener on unmount', () => {
    const onClickOutside = vi.fn();
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { result: refResult } = renderHook(createRefWrapper(targetElement));
    const { unmount } = renderHook(() => useOutsideClick(refResult.current, onClickOutside));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), true);
    removeEventListenerSpy.mockRestore();
  });

  it('calls callback multiple times on multiple outside clicks', () => {
    const onClickOutside = vi.fn();

    const { result: refResult } = renderHook(createRefWrapper(targetElement));

    renderHook(() => useOutsideClick(refResult.current, onClickOutside));

    // Multiple clicks outside
    for (let i = 0; i < 3; i++) {
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      outsideElement.dispatchEvent(clickEvent);
    }

    expect(onClickOutside).toHaveBeenCalledTimes(3);
  });

  it('updates callback when it changes', () => {
    const onClickOutside1 = vi.fn();
    const onClickOutside2 = vi.fn();

    const { result: refResult } = renderHook(createRefWrapper(targetElement));

    const { rerender } = renderHook(({ callback }) => useOutsideClick(refResult.current, callback), {
      initialProps: { callback: onClickOutside1 },
    });

    // Click with first callback
    outsideElement.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onClickOutside1).toHaveBeenCalledTimes(1);

    // Update callback
    rerender({ callback: onClickOutside2 });

    // Click with second callback
    outsideElement.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onClickOutside2).toHaveBeenCalledTimes(1);
  });
});
