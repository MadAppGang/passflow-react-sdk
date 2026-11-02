import { describe, expect, it } from 'vitest';
import { cn } from '../cn';

describe('cn', () => {
  it('should merge basic class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    expect(cn('foo', true && 'bar', 'baz')).toBe('foo bar baz');
  });

  it('should handle undefined and null values', () => {
    expect(cn('foo', undefined, 'bar', null)).toBe('foo bar');
  });

  it('should handle arrays of classes', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('should handle objects with boolean values', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('should handle empty input', () => {
    expect(cn()).toBe('');
  });

  it('keeps every class in order, including a caller className after the base classes', () => {
    expect(cn('passflow-button passflow-button--primary', { 'passflow-button--small': true }, 'host-extra')).toBe(
      'passflow-button passflow-button--primary passflow-button--small host-extra',
    );
  });
});
