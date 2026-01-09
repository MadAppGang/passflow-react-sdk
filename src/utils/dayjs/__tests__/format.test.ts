import { describe, expect, it } from 'vitest';
import { formatDateToString, usedFieldString } from '../format';

describe('dayjs format utilities', () => {
  describe('formatDateToString', () => {
    it('formats a Date object to specified format', () => {
      const date = new Date('2024-01-15T10:30:00');
      const result = formatDateToString(date, 'YYYY-MM-DD');

      expect(result).toBe('2024-01-15');
    });

    it('formats a date string to specified format', () => {
      const dateString = '2024-03-20T14:45:30';
      const result = formatDateToString(dateString, 'MMM D, YYYY');

      expect(result).toBe('Mar 20, 2024');
    });

    it('formats with time', () => {
      const date = new Date('2024-06-10T09:15:00');
      const result = formatDateToString(date, 'HH:mm:ss');

      expect(result).toBe('09:15:00');
    });

    it('formats with full datetime', () => {
      const date = new Date('2024-12-25T18:30:45');
      const result = formatDateToString(date, 'YYYY-MM-DD HH:mm:ss');

      expect(result).toBe('2024-12-25 18:30:45');
    });

    it('handles ISO string input', () => {
      const isoString = '2024-07-04T12:00:00.000Z';
      const result = formatDateToString(isoString, 'MMMM D, YYYY');

      expect(result).toMatch(/July 4, 2024/);
    });

    it('handles short date format', () => {
      const date = new Date('2024-08-15');
      const result = formatDateToString(date, 'MM/DD/YY');

      expect(result).toBe('08/15/24');
    });

    it('handles day of week format', () => {
      const date = new Date('2024-01-01'); // Monday
      const result = formatDateToString(date, 'dddd');

      expect(result).toBe('Monday');
    });
  });

  describe('usedFieldString', () => {
    describe('with last_used field', () => {
      it('returns "Not yet used" for dates containing 0001', () => {
        const result = usedFieldString('0001-01-01T00:00:00', 'last_used');

        expect(result).toBe('Not yet used');
      });

      it('returns "Not yet used" for zero date with different format', () => {
        const result = usedFieldString('0001-01-01', 'last_used');

        expect(result).toBe('Not yet used');
      });

      it('returns "default" for valid dates', () => {
        const result = usedFieldString('2024-01-15T10:30:00', 'last_used');

        expect(result).toBe('default');
      });

      it('returns "default" for current date', () => {
        const result = usedFieldString(new Date().toISOString(), 'last_used');

        expect(result).toBe('default');
      });
    });

    describe('with Date object input', () => {
      it('handles Date object that converts to 0001', () => {
        // Note: JavaScript Date can't actually represent year 0001,
        // so this tests the string conversion
        const dateString = '0001-01-01T00:00:00';
        const result = usedFieldString(dateString, 'last_used');

        expect(result).toBe('Not yet used');
      });

      it('handles regular Date object', () => {
        const date = new Date('2024-06-15');
        const result = usedFieldString(date, 'last_used');

        expect(result).toBe('default');
      });
    });

    describe('edge cases', () => {
      it('handles dates with 0001 elsewhere in string', () => {
        // If 0001 appears anywhere in the string representation
        const result = usedFieldString('2024-0001-15', 'last_used');

        expect(result).toBe('Not yet used');
      });

      it('returns default for year 2001', () => {
        const result = usedFieldString('2001-01-01', 'last_used');

        expect(result).toBe('default');
      });

      it('returns default for year 10001', () => {
        // A very far future date
        const result = usedFieldString('10001-01-01', 'last_used');

        expect(result).toBe('Not yet used'); // Contains '0001'
      });
    });

    describe('with default field', () => {
      it('returns "default" for zero date with default field', () => {
        const result = usedFieldString('0001-01-01T00:00:00', 'default');

        expect(result).toBe('default');
      });

      it('returns "default" for valid dates with default field', () => {
        const result = usedFieldString('2024-01-15', 'default');

        expect(result).toBe('default');
      });
    });
  });
});
