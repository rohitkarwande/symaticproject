import type { AlarmEvent } from '../../types/test';

export function generateAlarmCsv(events: AlarmEvent[], testId: string): string {
  const headers = [
    'Test ID',
    'Event ID',
    'Alarm Code',
    'Alarm Name',
    'Severity',
    'Description',
    'Trigger Timestamp',
    'Cleared Timestamp',
    'Acknowledged Status',
  ];

  const rows: string[] = [headers.join(',')];

  events.forEach((evt) => {
    const row = [
      testId || evt.testId || 'TRT-SYSTEM',
      evt.id,
      evt.alarmCode,
      `"${evt.alarmName}"`,
      evt.severity.toUpperCase(),
      `"${evt.description}"`,
      `"${evt.timestamp}"`,
      `"${evt.clearedTimestamp || 'ACTIVE / UNCLEARED'}"`,
      evt.acknowledged ? 'ACKNOWLEDGED' : 'UNACKNOWLEDGED',
    ];
    rows.push(row.join(','));
  });

  return rows.join('\n');
}

export function downloadAlarmCsvFile(content: string, filename: string) {
  // Prepend \uFEFF UTF-8 BOM for Microsoft Excel formatting
  const bomPrefix = '\uFEFF';
  const blob = new Blob([bomPrefix + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
