/**
 * Utility for automatic client timezone and enterprise region detection.
 * Resolves local IANA timezone, UTC offset, and operational region classification.
 */

export interface DetectedGeoInfo {
  timezone: string;
  utcOffset: string;
  formattedTimezone: string;
  region: string;
  regionCode: string;
}

export function detectUserTimezoneAndRegion(): DetectedGeoInfo {
  let timezone = 'UTC';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    timezone = 'UTC';
  }

  // Calculate UTC offset (e.g. +08:00 or -05:00)
  const now = new Date();
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absMinutes / 60)).padStart(2, '0');
  const minutes = String(absMinutes % 60).padStart(2, '0');
  const utcOffset = `UTC${sign}${hours}:${minutes}`;

  // Operational region mapping from IANA timezone prefix
  let region = 'Global Control Plane';
  let regionCode = 'GL-Primary';

  if (timezone.startsWith('Asia/')) {
    region = 'AP-East / Southeast';
    regionCode = 'AP-SE-1';
  } else if (timezone.startsWith('America/') || timezone.startsWith('US/')) {
    region = 'US-East / Americas';
    regionCode = 'US-EA-1';
  } else if (timezone.startsWith('Europe/')) {
    region = 'EU-Central / Europe';
    regionCode = 'EU-CE-1';
  } else if (timezone.startsWith('Australia/') || timezone.startsWith('Pacific/')) {
    region = 'AP-Oceania';
    regionCode = 'AP-OC-1';
  } else if (timezone.startsWith('Africa/')) {
    region = 'AF-South / Central';
    regionCode = 'AF-SC-1';
  }

  const formattedTimezone = `${timezone} (${utcOffset})`;

  return {
    timezone,
    utcOffset,
    formattedTimezone,
    region,
    regionCode,
  };
}
