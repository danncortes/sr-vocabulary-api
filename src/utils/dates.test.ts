import { getTodaysDay, addDaysToDate } from './dates.js';

describe('getTodaysDay', () => {
    it('should return the correct day for each day of the week', () => {
        const originalDate = global.Date;

        // Test all days of the week (Sunday = 0, Monday = 1, etc.)
        const weekDays = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
        ];

        for (let i = 0; i < 7; i++) {
            const mockDate = new Date(2023, 0, i + 1);
            global.Date = class extends Date {
                constructor() {
                    super();
                    return mockDate;
                }
            } as DateConstructor;
            expect(getTodaysDay()).toBe(weekDays[mockDate.getDay()]);
        }

        // Restore the original Date constructor
        global.Date = originalDate;
    });

    it('should return a valid day of the week', () => {
        const validDays = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
        ];

        // Test that getTodaysDay returns one of the valid days
        expect(validDays).toContain(getTodaysDay());
    });

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