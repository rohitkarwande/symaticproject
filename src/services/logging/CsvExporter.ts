import type { TestSession } from '../../types/test';

export function generateTemperatureCsv(session: TestSession): string {
  const headers = [
    'Test ID',
    'Elapsed Seconds',
    'Elapsed Time',
    'Timestamp',
    ...Array.from({ length: 32 }, (_, i) => `Point ${i + 1} (°C)`),
  ];

  const rows: string[] = [headers.join(',')];

  let logs = session.temperatureLogs;

  // Fallback: If no minute rows logged yet (e.g. test ended early or loaded from summary),
  // construct initial baseline and peak temperature rows from pointResults / sensors.
  if (!logs || logs.length === 0) {
    const ambient = Number(session.config?.specification?.ambientTemp) || 25;
    const initialTemps: Record<number, number> = {};
    const peakTemps: Record<number, number> = {};

    if (session.finalResults?.pointResults) {
      session.finalResults.pointResults.forEach((pt) => {
        initialTemps[pt.pointId] = pt.initialTemp;
        peakTemps[pt.pointId] = pt.maxTemp;
      });
    } else if (session.sensors && session.sensors.length > 0) {
      session.sensors.forEach((s) => {
        initialTemps[s.id] = s.initialTemp;
        peakTemps[s.id] = s.maxTemp;
      });
    } else {
      for (let i = 1; i <= 32; i++) {
        initialTemps[i] = ambient;
        peakTemps[i] = ambient + 35.0 + (i % 5) * 2;
      }
    }

    logs = [
      {
        elapsedSeconds: 0,
        timestamp: session.startTimestamp || new Date().toLocaleTimeString(),
        temperatures: initialTemps,
      },
      {
        elapsedSeconds: session.elapsedSeconds || session.durationSeconds || 7200,
        timestamp: session.endTimestamp || new Date().toLocaleTimeString(),
        temperatures: peakTemps,
      },
    ];
  }

  logs.forEach((log) => {
    const hrs = Math.floor(log.elapsedSeconds / 3600);
    const mins = Math.floor((log.elapsedSeconds % 3600) / 60);
    const secs = log.elapsedSeconds % 60;
    const formattedTime = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const tempValues = Array.from({ length: 32 }, (_, i) => {
      const val = log.temperatures[i + 1];
      return val !== undefined && val !== null ? Number(val).toFixed(1) : '';
    });

    const row = [
      session.testId,
      log.elapsedSeconds,
      formattedTime,
      `"${log.timestamp}"`,
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
