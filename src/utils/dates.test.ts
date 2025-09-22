import { jest, describe, it, expect } from '@jest/globals';
import { addDaysToDate } from './dates.js';

describe('addDaysToDate', () => {
    it('should add days to a valid date', () => {
        // Test adding positive days
        expect(addDaysToDate('2023-01-01', 5)).toBe('2023-01-06');
        expect(addDaysToDate('2023-01-31', 1)).toBe('2023-02-01'); // Month rollover
        expect(addDaysToDate('2023-12-31', 1)).toBe('2024-01-01'); // Year rollover
    });

    it('should subtract days when given negative values', () => {
        expect(addDaysToDate('2023-01-10', -5)).toBe('2023-01-05');
        expect(addDaysToDate('2023-01-01', -1)).toBe('2022-12-31'); // Month and year rollover
    });

    it('should use current date when given null, "NULL", or empty string', () => {
        // Mock the Date constructor to return a fixed date
        const originalDate = global.Date;
        const fixedDate = new Date(2023, 0, 15);

        // Create a mock Date constructor that returns a new copy of the fixed date each time
        global.Date = jest.fn().mockImplementation(() => {
            return new originalDate(fixedDate.getTime());
        }) as unknown as DateConstructor;

        // Test with null, "NULL", and empty string
        expect(addDaysToDate(null as unknown as string, 5)).toBe('2023-01-20');
        expect(addDaysToDate('NULL', 5)).toBe('2023-01-20');
        expect(addDaysToDate('', 5)).toBe('2023-01-20');

        // Restore original Date constructor
        global.Date = originalDate;
    });

    it('should format the date correctly with leading zeros', () => {
        // Test single-digit month and day
        expect(addDaysToDate('2023-01-01', 7)).toBe('2023-01-08');

        // Test double-digit month and day
        expect(addDaysToDate('2023-10-10', 10)).toBe('2023-10-20');

        // Test transition from single to double digit
        expect(addDaysToDate('2023-01-05', 5)).toBe('2023-01-10');
    });
});