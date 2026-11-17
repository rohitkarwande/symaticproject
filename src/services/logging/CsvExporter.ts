import type { TestSession } from '../../types/test';
import { formatTimeOnly } from '../../utils/formatTime';

export function generateTemperatureCsv(session: TestSession): string {
  const sensorCount = Math.min(48, Math.max(1, Number(session.config?.specification?.sensorCount) || session.finalResults?.pointResults.length || 48));
  const headers = [
    'Time',
    'R Current (A)',
    'Y Current (A)',
    'B Current (A)',
    ...Array.from({ length: sensorCount }, (_, i) => `TEMP_${i + 1} (°C)`),
  ];

  const rows: string[] = [headers.join(',')];

  let logs = session.temperatureLogs;
  const hasLoggedData = Boolean(logs && logs.length > 0);

  // Fallback: If no interval rows logged yet, construct baseline with blank values
  if (!logs || logs.length === 0) {
    logs = [
      {
        elapsedSeconds: 0,
        timestamp: session.startTimestamp || new Date().toLocaleTimeString(),
        temperatures: {},
        currents: { r: 0, y: 0, b: 0 },
      },
    ];
  }

  logs.forEach((log) => {
    const rCurrent = hasLoggedData && log.currents?.r !== undefined ? Number(log.currents.r).toFixed(2) : (hasLoggedData ? '0.00' : '');
    const yCurrent = hasLoggedData && log.currents?.y !== undefined ? Number(log.currents.y).toFixed(2) : (hasLoggedData ? '0.00' : '');
    const bCurrent = hasLoggedData && log.currents?.b !== undefined ? Number(log.currents.b).toFixed(2) : (hasLoggedData ? '0.00' : '');

    const tempValues = Array.from({ length: sensorCount }, (_, i) => {
      const val = log.temperatures[i + 1];
      if (val === undefined || val === null) return '';
      const num = Number(val);
      return num >= 30000 ? 'FAIL' : num.toFixed(1);
    });

    const row = [
      `"${formatTimeOnly(log.timestamp)}"`,
      rCurrent,
      yCurrent,
      bCurrent,
      ...tempValues,
    ];

    rows.push(row.join(','));
  });

  return rows.join('\n');
}

export function downloadCsvFile(content: string, filename: string) {
  // Prepend \uFEFF (UTF-8 Byte Order Mark) so Microsoft Excel opens °C cleanly without Â° encoding artifacts
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
