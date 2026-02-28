import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultNavigate } from '../navigation-context';

describe('defaultNavigate', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock window.location
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
  });

  describe('without replace option', () => {
    it('navigates to path without search params', () => {
      defaultNavigate({ to: '/dashboard' });

      expect(window.location.href).toBe('/dashboard');
    });

    it('navigates to path with search params (with ?)', () => {
      defaultNavigate({ to: '/dashboard', search: '?foo=bar' });

      expect(window.location.href).toBe('/dashboard?foo=bar');
    });

    it('navigates to path with search params (without ?)', () => {
      defaultNavigate({ to: '/dashboard', search: 'foo=bar' });

      expect(window.location.href).toBe('/dashboard?foo=bar');
    });

    it('handles empty search string', () => {
      defaultNavigate({ to: '/dashboard', search: '' });

      expect(window.location.href).toBe('/dashboard');
    });

    it('handles multiple search params', () => {
      defaultNavigate({ to: '/search', search: 'q=test&page=1&sort=asc' });

      expect(window.location.href).toBe('/search?q=test&page=1&sort=asc');
    });
  });

  describe('with replace option', () => {
    it('uses location.replace when replace is true', () => {
      defaultNavigate({ to: '/login', replace: true });

      expect(window.location.replace).toHaveBeenCalledWith('/login');
    });

    it('uses location.replace with search params', () => {
      defaultNavigate({ to: '/login', search: 'redirect=/home', replace: true });

      expect(window.location.replace).toHaveBeenCalledWith('/login?redirect=/home');
    });

    it('uses location.replace with search params starting with ?', () => {
      defaultNavigate({ to: '/auth', search: '?token=abc', replace: true });

      expect(window.location.replace).toHaveBeenCalledWith('/auth?token=abc');
    });
  });

  describe('edge cases', () => {
    it('handles absolute URLs', () => {
      defaultNavigate({ to: 'https://example.com/callback' });

      expect(window.location.href).toBe('https://example.com/callback');
    });

    it('handles root path', () => {
      defaultNavigate({ to: '/' });

      expect(window.location.href).toBe('/');
    });

    it('handles path with hash', () => {
      defaultNavigate({ to: '/page#section' });

      expect(window.location.href).toBe('/page#section');
    });

    it('handles undefined search', () => {
      defaultNavigate({ to: '/page', search: undefined });

      expect(window.location.href).toBe('/page');
    });

    it('handles replace false explicitly', () => {
      defaultNavigate({ to: '/page', replace: false });

      expect(window.location.href).toBe('/page');
      expect(window.location.replace).not.toHaveBeenCalled();
    });
  });
});
