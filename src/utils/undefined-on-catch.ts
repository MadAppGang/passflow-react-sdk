export function undefinedOnCatch<T, K>(fn: (t: K) => T): (t: K) => T | undefined {
  return (t: K) => {
    try {
      return fn(t);
    } catch (error) {
      return undefined;
    }
  };
}
