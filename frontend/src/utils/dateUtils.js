/**
 * Utility functions for handling Indian Standard Time (IST) formatting and parsing.
 * Forces IST timezone regardless of the user's browser settings.
 */

const TIMEZONE = 'Asia/Kolkata';

// Formats date to: DD MMM YYYY (e.g. 29 Apr 2026)
export const formatISTDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-IN', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// Formats date to: DD MMM, HH:MM (e.g. 29 Apr, 10:00)
export const formatISTDateTime = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('en-IN', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Parses a datetime-local string ("YYYY-MM-DDTHH:mm") as IST and returns UTC ISO string.
export const parseISTDateTimeInput = (dateTimeLocalString) => {
  if (!dateTimeLocalString) return null;
  // Append +05:30 to explicitly parse it as IST time
  const istDate = new Date(`${dateTimeLocalString}+05:30`);
  return istDate.toISOString();
};

// Converts UTC ISO string to "YYYY-MM-DDTHH:mm" in IST for datetime-local inputs
export const toISTDateTimeLocalString = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Format each part explicitly in IST
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Intl format for 'en-CA' is YYYY-MM-DD, h:mm
  // We need to construct YYYY-MM-DDTHH:mm
  const parts = formatter.formatToParts(date);
  const getPart = (type) => parts.find(p => p.type === type).value;
  
  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  let hour = getPart('hour');
  const minute = getPart('minute');
  
  // Handle hour 24 format edge case
  if (hour === '24') hour = '00';
  
  return `${year}-${month}-${day}T${hour}:${minute}`;
};
