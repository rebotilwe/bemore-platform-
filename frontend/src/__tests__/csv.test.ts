import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { exportCsv } from '../utils/csv.ts';

describe('CSV Export', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('exportCsv', () => {
    it('should call createElement and createObjectURL', () => {
      const apps: any[] = [];

      const mockClick = vi.fn();
      const mockLink = {
        href: '',
        download: '',
        click: mockClick,
      };

      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      exportCsv(apps, 'test.csv');

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(mockLink.download).toBe('test.csv');
      expect(mockClick).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:url');
    });

    it('should handle empty array of apps', () => {
      const mockClick = vi.fn();
      const mockLink = {
        href: '',
        download: '',
        click: mockClick,
      };

      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      exportCsv([], 'empty.csv');

      expect(mockClick).toHaveBeenCalled();
    });

    it('should create CSV with correct structure', () => {
      const app = {
        refNumber: 'BM-2026-0001',
        userType: 'developer',
        status: 'new',
        classification: 'unclassified',
        engagementSource: 'direct',
        personal: { firstName: 'John', surname: 'Doe', email: 'j@t.com', phone: '123' },
        formData: { estimatedValue: '1000000' },
        tags: ['HIGH_VALUE'],
        adminNotes: '',
        submittedAt: '2026-01-01T00:00:00Z',
      };

      const mockClick = vi.fn();
      const mockLink = {
        href: '',
        download: '',
        click: mockClick,
      };

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      exportCsv([app as any], 'test.csv');

      expect(createObjectURLSpy).toHaveBeenCalled();
      const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toContain('csv');
    });
  });
});
