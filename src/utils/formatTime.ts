export function formatTimeOnly(rawTimestamp: string): string {
  if (!rawTimestamp) return '';
  const str = String(rawTimestamp).trim();
  if (str.includes(',')) {
    return str.split(',')[1].trim();
  }
  if (str.includes('T')) {
    const timePart = str.split('T')[1];
    return timePart.split('.')[0].replace('Z', '').trim();
  }
  const parts = str.split(' ');
  if (parts.length >= 2 && (parts[0].includes('-') || parts[0].includes('/'))) {
    return parts.slice(1).join(' ').trim();
  }
  return str;
}

