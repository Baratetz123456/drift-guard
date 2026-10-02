import * as XLSX from 'xlsx';
import { Snapshot } from '../types';

/**
 * Sanitize sheet name according to Excel limits (max 31 chars, no forbidden chars : \ / ? * [ ]).
 */
function sanitizeSheetName(name: string, fallbackIndex: number, existingNames: Set<string>): string {
  // Strip characters forbidden by Excel in sheet names
  let clean = name.replace(/[:\\/?*\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) clean = `Command_${fallbackIndex + 1}`;
  if (clean.length > 31) clean = clean.substring(0, 31).trim();

  // Handle collision
  let candidate = clean;
  let counter = 1;
  while (existingNames.has(candidate.toLowerCase())) {
    const suffix = `_${counter}`;
    candidate = `${clean.substring(0, 31 - suffix.length)}${suffix}`;
    counter++;
  }
  existingNames.add(candidate.toLowerCase());
  return candidate;
}

/**
 * Escape and format value for RFC 4180 CSV export.
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Trigger browser file download from Blob or binary buffer.
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Dynamically computes column widths with safety padding (+4 chars) and minimums.
 */
function computeAutoColumnWidths(
  data: (string | number | null | undefined)[][],
  minWidths?: number[],
  maxCap: number = 160
): { wch: number }[] {
  const colCount = Math.max(...data.map((row) => row.length), 0);
  const widths: number[] = new Array(colCount).fill(12);

  if (minWidths) {
    minWidths.forEach((mw, i) => {
      if (i < widths.length) widths[i] = mw;
    });
  }

  for (const row of data) {
    row.forEach((cell, colIdx) => {
      if (cell !== null && cell !== undefined) {
        const str = String(cell);
        const lines = str.split('\n');
        const maxLineLen = Math.max(...lines.map((l) => l.length));
        const needed = maxLineLen + 4; // safety padding
        if (needed > widths[colIdx]) {
          widths[colIdx] = Math.min(needed, maxCap);
        }
      }
    });
  }

  return widths.map((w) => ({ wch: w }));
}

/**
 * Helper to build row heights specification array.
 */
function buildRowHeights(heights: number[]): { hpt: number }[] {
  return heights.map((h) => ({ hpt: h }));
}

/**
 * Export a single snapshot as a formatted multi-sheet Excel workbook (.xlsx).
 * Sheet 1: Executive segmented summary metadata & command inventory
 * Sheets 2..N: Dedicated worksheet per Cisco command with pinned headers & line numbers
 */
export function exportSingleSnapshotExcel(snapshot: Snapshot) {
  const wb = XLSX.utils.book_new();
  const existingSheetNames = new Set<string>();

  // =========================================================================
  // 1. SUMMARY SHEET
  // =========================================================================
  const summaryData: (string | number)[][] = [
    ['DRIFTGUARD NETWORK SNAPSHOT AUDIT REPORT', '', '', '', ''],
    ['CONFIDENTIAL — OPERATIONAL INFRASTRUCTURE AUDIT', `Generated: ${new Date().toISOString()}`, '', '', ''],
    ['', '', '', '', ''],
    ['TARGET DEVICE CONTEXT', '', '', '', ''],
    ['Device Name', snapshot.deviceName, '', '', ''],
    ['Management IP / Hostname', snapshot.deviceHostname, '', '', ''],
    ['Operating System Driver', snapshot.deviceType, '', '', ''],
    ['Captured Timestamp (Local)', new Date(snapshot.timestamp).toLocaleString(), '', '', ''],
    ['Captured Timestamp (UTC)', snapshot.timestamp, '', '', ''],
    ['', '', '', '', ''],
    ['MAINTENANCE & GOVERNANCE', '', '', '', ''],
    ['Snapshot ID', snapshot.snapshotId, '', '', ''],
    ['Lifecycle Stage', snapshot.snapshotType.toUpperCase(), '', '', ''],
    ['Change Ticket Reference', snapshot.changeTicket || 'N/A', '', '', ''],
    ['Associated Device Group', snapshot.groupId || 'N/A', '', '', ''],
    ['Associated Execution Batch', snapshot.batchId || 'N/A', '', '', ''],
    ['Operator Notes', snapshot.notes || 'N/A', '', '', ''],
    ['', '', '', '', ''],
    ['COMMANDS TELEMETRY INVENTORY', '', '', '', ''],
    ['#', 'Cisco Show Command', 'Output Lines', 'Capture Status', 'Telemetry Integrity'],
  ];

  const summaryRowHeights: number[] = [
    32, // Row 1: Title Banner
    18, // Row 2: Sub-banner
    10, // Row 3: Spacer
    24, // Row 4: Section 1 Header
    19, // Row 5: Device Name
    19, // Row 6: Hostname
    19, // Row 7: Driver
    19, // Row 8: Local Time
    19, // Row 9: UTC Time
    10, // Row 10: Spacer
    24, // Row 11: Section 2 Header
    19, // Row 12: Snapshot ID
    19, // Row 13: Stage
    19, // Row 14: Ticket
    19, // Row 15: Group
    19, // Row 16: Batch
    19, // Row 17: Notes
    10, // Row 18: Spacer
    24, // Row 19: Section 3 Header
    22, // Row 20: Table Columns Header
  ];

  snapshot.commands.forEach((cmd, idx) => {
    const rawOut = snapshot.outputs[cmd] || '';
    const lineCount = rawOut ? rawOut.split('\n').length : 0;
    const hasError = rawOut.includes('% Error') || rawOut.includes('% Invalid') || rawOut.includes('% Incomplete');
    summaryData.push([
      idx + 1,
      cmd,
      lineCount,
      hasError ? 'ERROR / REJECTED' : 'CAPTURED',
      hasError ? 'Inspection Required' : 'Authentic Read-Only Telemetry',
    ]);
    summaryRowHeights.push(19);
  });

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs['!cols'] = computeAutoColumnWidths(summaryData, [30, 48, 16, 20, 32]);
  summaryWs['!rows'] = buildRowHeights(summaryRowHeights);
  summaryWs['!views'] = [
    {
      state: 'frozen',
      xSplit: 0,
      ySplit: 20, // Pin table headers above data rows
      topLeftCell: 'A21',
      activeCell: 'A21',
      showGridLines: true,
    },
  ];

  XLSX.utils.book_append_sheet(wb, summaryWs, sanitizeSheetName('Summary', 0, existingSheetNames));

  // =========================================================================
  // 2. INDIVIDUAL COMMAND SHEETS
  // =========================================================================
  snapshot.commands.forEach((cmd, idx) => {
    const sheetName = sanitizeSheetName(cmd, idx, existingSheetNames);
    const rawOut = snapshot.outputs[cmd] || 'No terminal output recorded.';
    const lines = rawOut.split('\n');

    const cmdData: (string | number)[][] = [
      [`COMMAND: ${cmd}`, ''],
      [`DEVICE: ${snapshot.deviceName} (${snapshot.deviceHostname})`, `STAGE: ${snapshot.snapshotType.toUpperCase()}`],
      [`TIMESTAMP: ${new Date(snapshot.timestamp).toLocaleString()}`, `TOTAL TELEMETRY LINES: ${lines.length}`],
      ['CLASSIFICATION: CISCO SHOW COMMAND TELEMETRY', 'DRIFTGUARD TAMPER-EVIDENT VAULT'],
      ['', ''],
      ['Line #', 'Cisco CLI Terminal Output'],
    ];

    const cmdRowHeights: number[] = [
      26, // Row 1: Command Title
      18, // Row 2: Device & Stage
      18, // Row 3: Timestamp & Lines
      18, // Row 4: Classification
      10, // Row 5: Spacer
      22, // Row 6: Column Headers (Pinned)
    ];

    lines.forEach((line, lineIdx) => {
      cmdData.push([lineIdx + 1, line]);
      cmdRowHeights.push(19);
    });

    const cmdWs = XLSX.utils.aoa_to_sheet(cmdData);
    cmdWs['!cols'] = computeAutoColumnWidths(cmdData, [10, 130], 160);
    cmdWs['!rows'] = buildRowHeights(cmdRowHeights);
    cmdWs['!views'] = [
      {
        state: 'frozen',
        xSplit: 0,
        ySplit: 6, // Freeze rows 1 through 6 so headers stay pinned
        topLeftCell: 'A7',
        activeCell: 'A7',
        showGridLines: true,
      },
    ];

    XLSX.utils.book_append_sheet(wb, cmdWs, sheetName);
  });

  const filename = `driftguard-snapshot-${snapshot.deviceName}-${snapshot.snapshotId}.xlsx`.replace(
    /[^a-zA-Z0-9._-]/g,
    '_'
  );
  XLSX.writeFile(wb, filename);
}

/**
 * Export a single snapshot as an RFC 4180 flat tabular CSV.
 */
export function exportSingleSnapshotCsv(snapshot: Snapshot) {
  const headers = [
    'Snapshot ID',
    'Device Name',
    'Hostname',
    'Platform',
    'Stage',
    'Timestamp',
    'Change Ticket',
    'Command',
    'Line Count',
    'Raw Output',
  ];

  const rows: string[] = [headers.map(escapeCsv).join(',')];

  snapshot.commands.forEach((cmd) => {
    const raw = snapshot.outputs[cmd] || '';
    const lineCount = raw ? raw.split('\n').length : 0;
    const row = [
      escapeCsv(snapshot.snapshotId),
      escapeCsv(snapshot.deviceName),
      escapeCsv(snapshot.deviceHostname),
      escapeCsv(snapshot.deviceType),
      escapeCsv(snapshot.snapshotType),
      escapeCsv(snapshot.timestamp),
      escapeCsv(snapshot.changeTicket || ''),
      escapeCsv(cmd),
      escapeCsv(lineCount),
      escapeCsv(raw),
    ];
    rows.push(row.join(','));
  });

  const blob = new Blob([rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const filename = `driftguard-snapshot-${snapshot.deviceName}-${snapshot.snapshotId}.csv`.replace(
    /[^a-zA-Z0-9._-]/g,
    '_'
  );
  triggerDownload(blob, filename);
}

/**
 * Export a single snapshot as raw JSON archive.
 */
export function exportSingleSnapshotJson(snapshot: Snapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  const filename = `driftguard-snapshot-${snapshot.snapshotId}.json`;
  triggerDownload(blob, filename);
}

/**
 * Export multiple snapshots (e.g. filtered from the Vault table) to a formatted multi-sheet Excel workbook.
 * Sheet 1: Snapshots Registry
 * Sheet 2: Command Telemetry
 */
export function exportBulkSnapshotsExcel(snapshots: Snapshot[], filterLabel: string = 'All') {
  const wb = XLSX.utils.book_new();

  // =========================================================================
  // Sheet 1: Snapshots Registry
  // =========================================================================
  const registryData: (string | number)[][] = [
    ['DRIFTGUARD SNAPSHOT VAULT INVENTORY REPORT', '', '', '', '', '', '', '', '', '', ''],
    [`Filter Scope: ${filterLabel}`, `Total Records: ${snapshots.length}`, `Exported (UTC): ${new Date().toISOString()}`, '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', ''],
    [
      'Snapshot ID',
      'Device Name',
      'Hostname / IP',
      'Platform Driver',
      'Lifecycle Stage',
      'Captured Timestamp',
      'Change Ticket',
      'Commands Count',
      'Device Group',
      'Batch ID',
      'Operator Notes',
    ],
  ];

  const regRowHeights: number[] = [
    32, // Row 1: Title
    18, // Row 2: Metadata
    10, // Row 3: Spacer
    22, // Row 4: Column Headers (Pinned)
  ];

  snapshots.forEach((s) => {
    registryData.push([
      s.snapshotId,
      s.deviceName,
      s.deviceHostname,
      s.deviceType,
      s.snapshotType.toUpperCase(),
      new Date(s.timestamp).toLocaleString(),
      s.changeTicket || 'N/A',
      s.commands.length,
      s.groupId || 'N/A',
      s.batchId || 'N/A',
      s.notes || '',
    ]);
    regRowHeights.push(19);
  });

  const regWs = XLSX.utils.aoa_to_sheet(registryData);
  regWs['!cols'] = computeAutoColumnWidths(registryData, [24, 22, 20, 16, 16, 24, 18, 16, 18, 18, 36]);
  regWs['!rows'] = buildRowHeights(regRowHeights);
  regWs['!views'] = [
    {
      state: 'frozen',
      xSplit: 0,
      ySplit: 4, // Freeze header rows
      topLeftCell: 'A5',
      activeCell: 'A5',
      showGridLines: true,
    },
  ];
  XLSX.utils.book_append_sheet(wb, regWs, 'Snapshots Registry');

  // =========================================================================
  // Sheet 2: Command Telemetry across all snapshots
  // =========================================================================
  const telemetryData: (string | number)[][] = [
    ['DRIFTGUARD MULTI-SNAPSHOT COMMAND TELEMETRY AUDIT', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['Snapshot ID', 'Device Name', 'Lifecycle Stage', 'Cisco Show Command', 'Output Lines', 'Raw Output Preview'],
  ];

  const telRowHeights: number[] = [
    26, // Row 1: Title
    10, // Row 2: Spacer
    22, // Row 3: Headers (Pinned)
  ];

  snapshots.forEach((s) => {
    s.commands.forEach((cmd) => {
      const out = s.outputs[cmd] || '';
      const lineCount = out ? out.split('\n').length : 0;
      const preview = out.substring(0, 300).replace(/\n/g, ' ');
      telemetryData.push([s.snapshotId, s.deviceName, s.snapshotType.toUpperCase(), cmd, lineCount, preview]);
      telRowHeights.push(19);
    });
  });

  const telWs = XLSX.utils.aoa_to_sheet(telemetryData);
  telWs['!cols'] = computeAutoColumnWidths(telemetryData, [22, 22, 16, 36, 14, 80]);
  telWs['!rows'] = buildRowHeights(telRowHeights);
  telWs['!views'] = [
    {
      state: 'frozen',
      xSplit: 0,
      ySplit: 3, // Freeze headers
      topLeftCell: 'A4',
      activeCell: 'A4',
      showGridLines: true,
    },
  ];
  XLSX.utils.book_append_sheet(wb, telWs, 'Command Telemetry');

  const filename = `driftguard-vault-snapshots-${Date.now().toString(36)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Export multiple snapshots as flat tabular CSV.
 */
export function exportBulkSnapshotsCsv(snapshots: Snapshot[]) {
  const headers = [
    'Snapshot ID',
    'Device Name',
    'Hostname',
    'Platform',
    'Stage',
    'Timestamp',
    'Change Ticket',
    'Commands Count',
    'Group ID',
    'Batch ID',
    'Notes',
  ];

  const rows: string[] = [headers.map(escapeCsv).join(',')];

  snapshots.forEach((s) => {
    const row = [
      escapeCsv(s.snapshotId),
      escapeCsv(s.deviceName),
      escapeCsv(s.deviceHostname),
      escapeCsv(s.deviceType),
      escapeCsv(s.snapshotType),
      escapeCsv(s.timestamp),
      escapeCsv(s.changeTicket || ''),
      escapeCsv(s.commands.length),
      escapeCsv(s.groupId || ''),
      escapeCsv(s.batchId || ''),
      escapeCsv(s.notes || ''),
    ];
    rows.push(row.join(','));
  });

  const blob = new Blob([rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const filename = `driftguard-vault-snapshots-${Date.now().toString(36)}.csv`;
  triggerDownload(blob, filename);
}

/**
 * Export multiple snapshots as full JSON archive.
 */
export function exportBulkSnapshotsJson(snapshots: Snapshot[]) {
  const blob = new Blob([JSON.stringify(snapshots, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  const filename = `driftguard-vault-snapshots-${Date.now().toString(36)}.json`;
  triggerDownload(blob, filename);
}
