export function getTodaysDay(): number {
    const today = new Date();
    const dayOfWeek = today.getDay();
    return dayOfWeek;
}


export function addDaysToDate(date: string, days: number): string {
    let dateObj = new Date(date);
    if ([null, "NULL", ""].includes(date)) {
        dateObj = new Date();
    }
    dateObj.setDate(dateObj.getDate() + days);

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function getNextDateByDay(targetDay: number): string {
    const today = new Date();
    const currentDayIndex = today.getDay();
    const daysUntilTarget = (targetDay - currentDayIndex + 7) % 7;

    const nextTargetDate = new Date(today);
    nextTargetDate.setDate(today.getDate() + daysUntilTarget);

    const year = nextTargetDate.getFullYear();
    const month = String(nextTargetDate.getMonth() + 1).padStart(2, '0');
    const day = String(nextTargetDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function getFormatedDate(date: string) {
    return new Date(date).toISOString().split('T')[0];
}

export function isDateLessThanToday(date: string) {
    const today = new Date();
    const dateObj = new Date(date);
    return dateObj < today;
}
