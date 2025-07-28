/**
 * Converts a Date object to a string in the format YYYY-MM-DD.
 *
 * @param {Date} date - The date to be converted.
 * @returns {string} The formatted date string.
 */
export function YYYYMMDD(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
