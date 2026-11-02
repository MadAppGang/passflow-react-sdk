import clsx, { type ClassValue } from 'clsx';

// Joins class names. The library styles with `passflow-*` classes only, so
// there are no utility-class conflicts to resolve.
export const cn = (...classes: ClassValue[]) => clsx(classes);
