import { describe, it, expect } from 'vitest';
import { isValidUrl } from '../validate-url';

describe('isValidUrl', () => {
  it('should return true for valid http URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
    expect(isValidUrl('http://www.example.com')).toBe(true);
    expect(isValidUrl('http://example.com/path')).toBe(true);
    expect(isValidUrl('http://example.com:8080')).toBe(true);
  });

  it('should return true for valid https URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('https://www.example.com')).toBe(true);
    expect(isValidUrl('https://example.com/path')).toBe(true);
    expect(isValidUrl('https://example.com:443')).toBe(true);
  });

  it('should return false for invalid URLs', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('example.com')).toBe(false);
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl('htp://example.com')).toBe(false);
  });

  it('should return false for non-http(s) protocols', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false);
    expect(isValidUrl('file:///path/to/file')).toBe(false);
    expect(isValidUrl('mailto:test@example.com')).toBe(false);
    expect(isValidUrl('ws://example.com')).toBe(false);
  });

  it('should handle URLs with query parameters', () => {
    expect(isValidUrl('https://example.com?param=value')).toBe(true);
    expect(isValidUrl('http://example.com?foo=bar&baz=qux')).toBe(true);
  });

  it('should handle URLs with fragments', () => {
    expect(isValidUrl('https://example.com#section')).toBe(true);
    expect(isValidUrl('http://example.com/page#anchor')).toBe(true);
  });

  it('should handle malformed URLs', () => {
    expect(isValidUrl('http://')).toBe(false);
    expect(isValidUrl('https://')).toBe(false);
    expect(isValidUrl('http:// ')).toBe(false);
  });
});
