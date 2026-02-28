import { describe, expect, it } from 'vitest';
import { undefinedOnCatch } from '../undefined-on-catch';

describe('undefinedOnCatch', () => {
  it('should return the result when function succeeds', () => {
    const fn = (x: number) => x * 2;
    const wrapped = undefinedOnCatch(fn);

    expect(wrapped(5)).toBe(10);
    expect(wrapped(0)).toBe(0);
    expect(wrapped(-3)).toBe(-6);
  });

  it('should return undefined when function throws an error', () => {
    const fn = (x: number) => {
      if (x < 0) throw new Error('Negative number');
      return x * 2;
    };
    const wrapped = undefinedOnCatch(fn);

    expect(wrapped(-5)).toBeUndefined();
  });

  it('should handle functions that return objects', () => {
    const fn = (name: string) => ({ name, age: 25 });
    const wrapped = undefinedOnCatch(fn);

    expect(wrapped('Alice')).toEqual({ name: 'Alice', age: 25 });
  });

  it('should handle functions that return null or undefined', () => {
    const fnNull = () => null;
    const fnUndefined = () => undefined;

    const wrappedNull = undefinedOnCatch(fnNull);
    const wrappedUndefined = undefinedOnCatch(fnUndefined);

    expect(wrappedNull(0)).toBeNull();
    expect(wrappedUndefined(0)).toBeUndefined();
  });

  it('should catch different types of errors', () => {
    const fnTypeError = () => {
      // @ts-expect-error intentional error for testing
      return null.toString();
    };
    const wrapped = undefinedOnCatch(fnTypeError);

    expect(wrapped(0)).toBeUndefined();
  });

  it('should work with JSON parsing', () => {
    const parseJson = (json: string) => JSON.parse(json);
    const wrapped = undefinedOnCatch(parseJson);

    expect(wrapped('{"valid": true}')).toEqual({ valid: true });
    expect(wrapped('invalid json')).toBeUndefined();
  });

  it('should preserve the input parameter type', () => {
    type User = { id: number; name: string };
    const fn = (user: User) => user.name.toUpperCase();
    const wrapped = undefinedOnCatch(fn);

    expect(wrapped({ id: 1, name: 'john' })).toBe('JOHN');
  });
});
