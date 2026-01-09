import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getUrlErrors } from '../get-url-errors';

describe('getUrlErrors', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock window.location
    delete (window as any).location;
    window.location = { search: '' } as Location;
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('should extract error and message from URL search params', () => {
    window.location.search = '?error=invalid_credentials&message=Invalid%20username%20or%20password';

    const result = getUrlErrors();

    expect(result.error).toBe('invalid_credentials');
    expect(result.message).toBe('Invalid username or password');
  });

  it('should return null when error and message are not present', () => {
    window.location.search = '?foo=bar';

    const result = getUrlErrors();

    expect(result.error).toBeNull();
    expect(result.message).toBeNull();
  });

  it('should handle only error parameter', () => {
    window.location.search = '?error=not_found';

    const result = getUrlErrors();

    expect(result.error).toBe('not_found');
    expect(result.message).toBeNull();
  });

  it('should handle only message parameter', () => {
    window.location.search = '?message=Something%20went%20wrong';

    const result = getUrlErrors();

    expect(result.error).toBeNull();
    expect(result.message).toBe('Something went wrong');
  });

  it('should decode URL-encoded message', () => {
    window.location.search = '?message=Error%3A%20User%20not%20found%20%28404%29';

    const result = getUrlErrors();

    expect(result.message).toBe('Error: User not found (404)');
  });

  it('should extract from custom URL string', () => {
    const subUrl = 'https://example.com/callback?error=access_denied&message=Permission%20denied';

    const result = getUrlErrors(subUrl);

    expect(result.error).toBe('access_denied');
    expect(result.message).toBe('Permission denied');
  });

  it('should handle custom URL with only query params', () => {
    const subUrl = '?error=timeout&message=Request%20timed%20out';

    const result = getUrlErrors(subUrl);

    expect(result.error).toBe('timeout');
    expect(result.message).toBe('Request timed out');
  });

  it('should handle empty search params', () => {
    window.location.search = '';

    const result = getUrlErrors();

    expect(result.error).toBeNull();
    expect(result.message).toBeNull();
  });

  it('should handle URL with hash but no params', () => {
    window.location.search = '';

    const result = getUrlErrors();

    expect(result.error).toBeNull();
    expect(result.message).toBeNull();
  });

  it('should handle special characters in message', () => {
    window.location.search = '?error=server_error&message=Error%3A%20%22Internal%20Server%20Error%22%20%5B500%5D';

    const result = getUrlErrors();

    expect(result.error).toBe('server_error');
    expect(result.message).toBe('Error: "Internal Server Error" [500]');
  });

  it('should handle custom URL without protocol', () => {
    const subUrl = '/callback?error=expired&message=Session%20expired';

    const result = getUrlErrors(subUrl);

    expect(result.error).toBe('expired');
    expect(result.message).toBe('Session expired');
  });
});
