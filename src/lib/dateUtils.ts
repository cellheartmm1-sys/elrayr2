/**
 * Utility function to format dates strictly using the Gregorian calendar (ميلادي) in Arabic (ar-EG).
 */
export function formatGregorianDate(
  dateVal: string | Date | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('ar-EG', {
      calendar: 'gregory',
      ...options
    });
  } catch {
    return '-';
  }
}

/**
 * Helper to display attendance check-in/out times cleanly (e.g. "07:00 ص" / "05:00 م")
 * without any UTC/Timezone offset shift.
 */
export function formatTimeDisplay(timeStr: string | null | undefined): string {
  if (!timeStr) return '-';
  try {
    const str = String(timeStr);
    const match = str.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const period = hours >= 12 ? 'م' : 'ص';
      const displayHours = hours % 12 === 0 ? 12 : hours % 12;
      const padHours = String(displayHours).padStart(2, '0');
      return `${padHours}:${minutes} ${period}`;
    }
    return str;
  } catch {
    return String(timeStr);
  }
}

/**
 * Helper to compare two date values strictly by YYYY-MM-DD in local time
 * ignoring any ISO time, UTC timezone shifts, or trailing timestamps.
 */
export function isSameDate(d1: any, d2: any): boolean {
  if (!d1 || !d2) return false;
  const toYMD = (val: any) => {
    if (typeof val === 'string' && val.length >= 10) {
      if (val.includes('T')) {
        const dt = new Date(val);
        if (!isNaN(dt.getTime())) {
          const y = dt.getFullYear();
          const m = String(dt.getMonth() + 1).padStart(2, '0');
          const d = String(dt.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      }
      return val.slice(0, 10);
    }
    const dt = new Date(val);
    if (isNaN(dt.getTime())) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return toYMD(d1) === toYMD(d2);
}


