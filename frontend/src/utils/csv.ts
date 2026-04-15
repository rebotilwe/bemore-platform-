import type { Application } from '../types/index.ts';

function safeCell(v: unknown): string {
  let s = String(v ?? '').replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // Prevent CSV formula injection
  return `"${s}"`;
}

export function exportCsv(apps: Application[], filename: string): void {
  const headers = [
    'Ref', 'Type', 'Status', 'Classification', 'Source',
    'First Name', 'Surname', 'Email', 'Phone', 'Company',
    'Est. Value', 'Project Stage', 'Land Status', 'Tags',
    'Admin Notes', 'Submitted',
  ];
  const rows = apps.map(a => {
    const fd = a.formData || {};
    return [
      a.refNumber, a.userType, a.status,
      a.classification ?? 'unclassified',
      a.engagementSource ?? 'direct',
      a.personal?.firstName, a.personal?.surname,
      a.personal?.email, a.personal?.phone,
      a.personal?.companyName ?? '',
      fd.estimatedValue ?? '', fd.projectStage ?? '', fd.landStatus ?? '',
      (a.tags ?? []).join('; '),
      a.adminNotes ?? '',
      a.submittedAt ? new Date(a.submittedAt).toLocaleDateString('en-ZA') : '',
    ];
  });
  const csv = [headers, ...rows]
    .map(row => row.map(safeCell).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
