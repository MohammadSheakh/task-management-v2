import { DateTime } from 'luxon';

export const toLocalTime = (date: Date | string | null, zone: string = 'Africa/Lagos'): string | null => {
  if (!date) return null;
  return DateTime.fromJSDate(new Date(date))
    .setZone(zone)
    .toFormat("yyyy-MM-dd'T'HH:mm:ss");
};

export const toUTCTime = (dateString: Date | string, zone: string = 'Africa/Lagos'): Date => {
  return DateTime.fromISO(dateString, { zone })
    .toUTC()
    .toJSDate();
};