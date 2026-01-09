import { act, renderHook } from '@testing-library/react';
import type { FC, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NavigationContext, type NavigationContextType, type RouterType } from '../../context/navigation-context';
import { useNavigation } from '../use-navigation';

describe('useNavigation', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: {
        href: '',
        replace: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
    vi.clearAllMocks();
  });

  const createMockContext = (router: RouterType = 'default'): NavigationContextType => ({
    navigate: vi.fn(),
    setNavigate: vi.fn(),
    router,
  });

  const createWrapper =
    (context: NavigationContextType): FC<PropsWithChildren> =>
    ({ children }) => <NavigationContext.Provider value={context}>{children}</NavigationContext.Provider>;

  describe('basic hook behavior', () => {
    it('returns navigate function', () => {
      const mockContext = createMockContext();

      const { result } = renderHook(() => useNavigation(), {
        wrapper: createWrapper(mockContext),
      });

      expect(result.current.navigate).toBeDefined();
    });

    it('returns setNavigate function', () => {
      const mockContext = createMockContext();

      const { result } = renderHook(() => useNavigation(), {
        wrapper: createWrapper(mockContext),
      });

      expect(result.current.setNavigate).toBeDefined();
    });

    it('returns router type', () => {
      const mockContext = createMockContext('react-router');

      const { result } = renderHook(() => useNavigation(), {
        wrapper: createWrapper(mockContext),
      });

      expect(result.current.router).toBe('react-router');
    });
  });

  describe('setNavigate with null', () => {
    it('calls context setNavigate with null when newNavigate is null', () => {
      const mockContext = createMockContext();

      const { result } = renderHook(() => useNavigation(), {
        wrapper: createWrapper(mockContext),
      });

      act(() => {
        result.current.setNavigate(null);
      });

      expect(mockContext.setNavigate).toHaveBeenCalledWith(null);
    });
  });

  describe('setNavigate with default router', () => {
    it('uses window.location.href for navigation without replace', () => {
      const mockContext = createMockContext('default');
      const customNavigate = vi.fn();

      const { result } = renderHook(() => useNavigation(), {
        wrapper: createWrapper(mockContext),
      });

      act(() => {
        result.current.setNavigate(customNavigate);
      });

      // Get the wrapped navigate that was passed to setNavigate
      const wrappedNavigate = (mockContext.setNavigate as any).mock.calls[0][0];

      // Call the wrapped navigate
      wrappedNavigate({ to: '/dashboard', search: 'foo=bar', replace: false });

      expect(window.location.href).toBe('/dashboard?foo=bar');
    });

    it('uses window.location.replace for navigation with replace', () => {
      const mockContext = createMockContext('default');
      const customNavigate = vi.fn();

      const { result } = renderHook(() => useNavigation(), {
        wrapper: createWrapper(mockContext),
      });

      act(() => {
        result.current.setNavigate(customNavigate);
      });

      const wrappedNavigate = (mockContext.setNavigate as any).mock.calls[0][0];
      wrappedNavigate({ to: '/login', search: '', replace: true });

      expect(window.location.replace).toHaveBeenCalledWith('/login');
    });

    it('handles search params with question mark', () => {
      const mockContext = createMockContext('default');
      const customNavigate = vi.fn();

      const { result } = renderHook(() => useNavigation(), {
        wrapper: createWrapper(mockContext),
      });

      act(() => {
        result.current.setNavigate(customNavigate);
      });

      const wrappedNavigate = (mockContext.setNavigate as any).mock.calls[0][0];
      wrappedNavigate({ to: '/page', search: '?existing=param' });

      expect(window.location.href).toBe('/page?existing=param');
    });
  });

  describe('setNavigate with react-router', () => {
    it('adapts navigation options for react-router', () => {
      const mockContext = createMockContext('react-router');
      const customNavigate = vi.fn();

      const { result } = renderHook(() => useNavigation(), {
        wrapper: createWrapper(mockContext),
      });

      act(() => {
        result.current.setNavigate(customNavigate);
      });

      const wrappedNavigate = (mockContext.setNavigate as any).mock.calls[0][0];
      wrappedNavigate({ to: '/profile', search: 'tab=settings', replace: false });

      expect(customNavigate).toHaveBeenCalledWith({
        pathname: '/profile',
        search: '?tab=settings',
        replace: false,
      });
    });

    it('preserves question mark in search for react-router', () => {
      const mockContext = createMockContext('react-router');
      const customNavigate = vi.fn();

      const { result } = renderHook(() => useNavigation(), {
        wrapper: createWrapper(mockContext),
      });

      act(() => {
        result.current.setNavigate(customNavigate);
      });

      const wrappedNavigate = (mockContext.setNavigate as any).mock.calls[0][0];
      wrappedNavigate({ to: '/page', search: '?already=prefixed' });

      expect(customNavigate).toHaveBeenCalledWith({
        pathname: '/page',
        search: '?already=prefixed',
        replace: false,
      });
    });
  });

  describe('setNavigate with tanstack-router', () => {
    it('adapts navigation options for tanstack-router', () => {
      const mockContext = createMockContext('tanstack-router');
      const customNavigate = vi.fn();

      const { result } = renderHook(() => useNavigation(), {
        wrapper: createWrapper(mockContext),
      });

      act(() => {
        result.current.setNavigate(customNavigate);
      });

      const wrappedNavigate = (mockContext.setNavigate as any).mock.calls[0][0];
      wrappedNavigate({ to: '/users', search: 'page=1&sort=name', replace: true });

      expect(customNavigate).toHaveBeenCalledWith({
        to: '/users',
        search: { page: '1', sort: 'name' },
        replace: true,
      });
    });

    it('handles empty search for tanstack-router', () => {
      const mockContext = createMockContext('tanstack-router');
      const customNavigate = vi.fn();

      const { result } = renderHook(() => useNavigation(), {
        wrapper: createWrapper(mockContext),
      });

      act(() => {
        result.current.setNavigate(customNavigate);
      });

      const wrappedNavigate = (mockContext.setNavigate as any).mock.calls[0][0];
      wrappedNavigate({ to: '/home', search: '' });

      expect(customNavigate).toHaveBeenCalledWith({
        to: '/home',
        search: {},
        replace: false,
      });
    });
  });

  describe('setNavigate with wouter', () => {
    it('adapts navigation options for wouter', () => {
      const mockContext = createMockContext('wouter');
      const customNavigate = vi.fn();

      const { result } = renderHook(() => useNavigation(), {
        wrapper: createWrapper(mockContext),
      });

      act(() => {
        result.current.setNavigate(customNavigate);
      });

      const wrappedNavigate = (mockContext.setNavigate as any).mock.calls[0][0];
      wrappedNavigate({ to: '/about', search: 'ref=home', replace: false });

      expect(customNavigate).toHaveBeenCalledWith({
        to: '/about?ref=home',
        replace: false,
      });
    });

    it('handles search with question mark for wouter', () => {
      const mockContext = createMockContext('wouter');
      const customNavigate = vi.fn();

      const { result } = renderHook(() => useNavigation(), {
        wrapper: createWrapper(mockContext),
      });

      act(() => {
        result.current.setNavigate(customNavigate);
      });

      const wrappedNavigate = (mockContext.setNavigate as any).mock.calls[0][0];
      wrappedNavigate({ to: '/page', search: '?existing=value' });

      expect(customNavigate).toHaveBeenCalledWith({
        to: '/page?existing=value',
        replace: false,
      });
    });

    it('handles empty search for wouter', () => {
      const mockContext = createMockContext('wouter');
      const customNavigate = vi.fn();

      const { result } = renderHook(() => useNavigation(), {
        wrapper: createWrapper(mockContext),
      });

      act(() => {
        result.current.setNavigate(customNavigate);
      });

      const wrappedNavigate = (mockContext.setNavigate as any).mock.calls[0][0];
      wrappedNavigate({ to: '/contact', search: '' });

      expect(customNavigate).toHaveBeenCalledWith({
        to: '/contact',
        replace: false,
      });
    });
  });
});
