import type { Application } from '../types/index.ts';

export function exportCsv(apps: Application[], filename: string): void {
  const headers = ['Ref', 'Type', 'First Name', 'Surname', 'Email', 'Phone', 'Company', 'Tags', 'Status', 'Submitted'];
  const rows = apps.map(a => [
    a.refNumber, a.userType,
    a.personal?.firstName, a.personal?.surname,
    a.personal?.email, a.personal?.phone,
    a.personal?.companyName ?? '',
    (a.tags ?? []).join(';'), a.status,
    new Date(a.submittedAt).toISOString().split('T')[0],
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
