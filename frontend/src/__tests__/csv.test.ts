import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { exportCsv } from '../utils/csv.ts';
import type { Application, ProfileCategory } from '../types/index.ts';

// jsdom does not provide URL.createObjectURL/revokeObjectURL — polyfill here so
// `exportCsv` can run end-to-end and we can capture the generated Blob.
const mockBlobUrls = new Map<Blob, string>();
const originalCreateObjectURL = typeof URL !== 'undefined' ? URL.createObjectURL?.bind(URL) : undefined;
if (!originalCreateObjectURL) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (URL as any).createObjectURL = (blob: Blob) => {
    const url = `blob:${Math.random().toString(36).slice(2)}`;
    mockBlobUrls.set(blob, url);
    return url;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (URL as any).revokeObjectURL = (url: string) => {
    for (const [blob, blobUrl] of mockBlobUrls) {
      if (blobUrl === url) {
        mockBlobUrls.delete(blob);
        break;
      }
    }
  };
}

interface AppOverrides extends Partial<Application> {
  formData?: Record<string, unknown>;
}

function makeApp(userType: ProfileCategory, overrides: AppOverrides = {}): Application {
  return {
    _id: '1',
    refNumber: 'BM-00000001',
    userType,
    personal: { firstName: 'Alex', surname: 'Doe', email: 'a@b.co', phone: '+27821234567' },
    formData: {},
    tags: [],
    status: 'new',
    dealRoom: { summitAccess: false, dealRoomEntry: false, funders: ['PBSA'] },
    submittedAt: '2026-05-01T08:00:00.000Z',
    ...overrides,
  } as Application;
}

/** Run exportCsv and return the parsed CSV text + the blob, with all browser
 *  side effects mocked. */
function captureCsv(apps: Application[], filename = 'test.csv'): { text: string; rows: string[][] } {
  const mockClick = vi.fn();
  const mockLink = { href: '', download: '', click: mockClick };
  vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLAnchorElement);
  const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

  // Capture the Blob's text body via a spy that intercepts the constructor.
  // jsdom's Blob doesn't expose the parts directly — we read it from the spy
  // call args instead.
  let captured: string = '';
  const realBlob = global.Blob;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global.Blob = function (parts: BlobPart[], opts?: BlobPropertyBag): Blob {
    captured = parts.map((p) => (typeof p === 'string' ? p : '')).join('');
    return new realBlob(parts, opts);
  } as unknown as typeof Blob;

  try {
    exportCsv(apps, filename);
  } finally {
    global.Blob = realBlob;
  }

  // Strip leading BOM (U+FEFF) for easier text assertions.
  const text = captured.replace(/^﻿/, '');
  // Naïve parser sufficient for our quoted-cell format `"…","…"`.
  const rows = text.split('\n').map((line) => {
    const cells: string[] = [];
    const re = /"((?:[^"]|"")*)"/g;
    let m;
    while ((m = re.exec(line)) !== null) cells.push(m[1].replace(/""/g, '"'));
    return cells;
  });
  void createSpy;
  return { text, rows };
}

describe('exportCsv', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });

  it('triggers a download with the requested filename', () => {
    const mockClick = vi.fn();
    const mockLink = { href: '', download: '', click: mockClick };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLAnchorElement);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    exportCsv([], 'export.csv');

    expect(mockLink.download).toBe('export.csv');
    expect(mockClick).toHaveBeenCalled();
  });

  it('emits the universal column header set on every export', () => {
    const { rows } = captureCsv([]);
    expect(rows[0]).toEqual([
      'Ref Number', 'User Type', 'First Name', 'Surname', 'Email', 'Phone',
      'Status', 'Classification', 'Activity Level', 'Feedback',
      'Created At', 'Tags',
    ]);
  });

  it('includes per-profile columns only when that profile is in the input set', () => {
    const { rows: devOnly } = captureCsv([makeApp('developer')]);
    expect(devOnly[0]).toContain('Development Stage');
    expect(devOnly[0]).toContain('Project Value');
    expect(devOnly[0]).not.toContain('Land Outcome'); // landowner column
    expect(devOnly[0]).not.toContain('Investment Range'); // investor column

    const { rows: mixed } = captureCsv([makeApp('developer'), makeApp('landowner')]);
    expect(mixed[0]).toContain('Development Stage');
    expect(mixed[0]).toContain('Land Outcome');
    expect(mixed[0]).not.toContain('Investment Range');
  });

  it('renders empty cells for old-shape applications missing new field IDs and excludes legacy column headers', () => {
    const legacy = makeApp('developer', {
      // legacy keys (estimatedValue, projectStage, landStatus) — should be ignored
      formData: { estimatedValue: '1000000', projectStage: 'land', landStatus: 'owned' },
    });
    const { rows } = captureCsv([legacy]);

    // Legacy column headers from the previous CSV must be gone.
    expect(rows[0]).not.toContain('Est. Value');
    expect(rows[0]).not.toContain('Project Stage');
    expect(rows[0]).not.toContain('Land Status');

    // Find profile-conditional column indexes and assert they're empty.
    const idxStage = rows[0].indexOf('Development Stage');
    const idxValue = rows[0].indexOf('Project Value');
    expect(rows[1][idxStage]).toBe('');
    expect(rows[1][idxValue]).toBe('');
  });

  it('prefixes formula-injection cells with a single quote', () => {
    const evilApp = makeApp('developer', {
      personal: { firstName: '=cmd|" /C calc"!A0', surname: 'X', email: 'e@x.co', phone: '0' },
      formData: { developmentStage: '+SUM(A1:A2)', biggestConstraint: '@SUM(1)' },
    });
    const { rows } = captureCsv([evilApp]);
    const row = rows[1];
    const idxFirst = rows[0].indexOf('First Name');
    const idxStage = rows[0].indexOf('Development Stage');
    const idxConstraint = rows[0].indexOf('Biggest Constraint');
    expect(row[idxFirst].startsWith("'=")).toBe(true);
    expect(row[idxStage].startsWith("'+")).toBe(true);
    expect(row[idxConstraint].startsWith("'@")).toBe(true);
  });

  it('joins array values with `; ` (e.g. provinces, projectTypes)', () => {
    const pro = makeApp('professional', {
      formData: {
        primaryRole: 'Architect',
        experienceLevel: 'Senior (10+ years)',
        provinces: ['Gauteng', 'Western Cape', 'KwaZulu-Natal'],
        avgProjectSize: 'Major (R50M+)',
      },
    });
    const { rows } = captureCsv([pro]);
    const idx = rows[0].indexOf('Provinces');
    expect(rows[1][idx]).toBe('Gauteng; Western Cape; KwaZulu-Natal');
  });

  it('renders Has Cv as "Yes" when a Professional has a cv attachment, empty otherwise', () => {
    const withCv = makeApp('professional', {
      attachments: [{ field: 'cv', filename: 'r.pdf', storedAs: 'abc.pdf', size: 100, mimeType: 'application/pdf' }],
    });
    const withoutCv = makeApp('professional', {
      refNumber: 'BM-00000002',
      attachments: [],
    });
    const { rows } = captureCsv([withCv, withoutCv]);
    const idx = rows[0].indexOf('Has Cv');
    expect(rows[1][idx]).toBe('Yes');
    expect(rows[2][idx]).toBe('');
  });

  it('strips legacy tags from the Tags column', () => {
    const app = makeApp('developer', {
      tags: ['HIGH_VALUE', 'LAND_SECURED', 'SEEKS_EQUITY', 'SHOVEL_READY', 'INVESTOR'],
    });
    const { rows } = captureCsv([app]);
    const idx = rows[0].indexOf('Tags');
    const tagCell = rows[1][idx];
    expect(tagCell).toContain('HIGH_VALUE');
    expect(tagCell).toContain('SHOVEL_READY');
    expect(tagCell).not.toContain('LAND_SECURED');
    expect(tagCell).not.toContain('SEEKS_EQUITY');
    expect(tagCell).not.toContain('INVESTOR');
    // Joined with `; ` — exact form depends on order, just check the separator.
    expect(tagCell).toMatch(/HIGH_VALUE.*SHOVEL_READY|SHOVEL_READY.*HIGH_VALUE/);
    expect(tagCell.includes('; ')).toBe(true);
  });

  it('renders createdAt as an ISO string from submittedAt', () => {
    const app = makeApp('aspiring', { submittedAt: '2026-05-01T08:00:00.000Z' });
    const { rows } = captureCsv([app]);
    const idx = rows[0].indexOf('Created At');
    expect(rows[1][idx]).toBe('2026-05-01T08:00:00.000Z');
  });

  it('emits universal columns + activity/feedback for a fully-filled application', () => {
    const app = makeApp('developer', {
      classification: 'hot',
      tags: ['HIGH_VALUE', 'SHOVEL_READY'],
      formData: {
        activityLevel: 'Actively looking',
        feedback: 'Looks great',
        developmentStage: 'Construction-ready',
        projectValue: 'R20M–R100M',
        fundingPosition: 'In discussions',
        biggestConstraint: 'Funding',
      },
    });
    const { rows } = captureCsv([app]);
    const r = rows[1];
    const get = (h: string) => r[rows[0].indexOf(h)];
    expect(get('Activity Level')).toBe('Actively looking');
    expect(get('Feedback')).toBe('Looks great');
    expect(get('Classification')).toBe('hot');
    expect(get('Development Stage')).toBe('Construction-ready');
    expect(get('Project Value')).toBe('R20M–R100M');
  });
});
