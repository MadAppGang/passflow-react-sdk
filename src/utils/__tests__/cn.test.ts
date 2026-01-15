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

  it('should merge Tailwind classes without conflicts', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
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

  it('should handle complex Tailwind conflict resolution', () => {
    expect(cn('text-sm text-lg')).toBe('text-lg');
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });

  it('should handle mixed conditional and Tailwind classes', () => {
    expect(cn('p-4', false && 'p-2', 'text-red-500')).toBe('p-4 text-red-500');
  });
});
