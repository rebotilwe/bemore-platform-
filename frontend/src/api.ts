import type {
  ApiResponse, PaginatedResponse, StatsData, LoginResponse, ReportData,
  Application, SubmitPayload, UpdatePayload, FilterParams, ReportName,
  AnalyticsDashboard, FunnelData, TrendData, TagAnalytics, DemographicsData, DealRoomAnalytics,
  TrafficOverview, TrafficTrends, ReferrerData, DeviceData, HourlyData, FormFunnelData, ClickData,
  UploadResponse,
} from './types/index.ts';
import { store, localStore } from './store.ts';
import { autoTag } from './utils/auto-tag.ts';
import { generateRefNumber } from './utils/format.ts';

// Always use relative /api path — Vercel rewrites it to the Railway backend.
const API_URL = '/api';

const REQUEST_TIMEOUT = 15000;
const RETRY_DELAY = 2000;
const MAX_RETRIES = 1;

function getAuthToken(): string | null {
  return sessionStorage.getItem('bm_token');
}

function getCsrfToken(): string | null {
  return sessionStorage.getItem('bm_csrf');
}

async function fetchWithTimeout(url: string, opts: RequestInit, timeout = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

const CSRF_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const authToken = getAuthToken();
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  if (CSRF_METHODS.includes(method.toUpperCase())) {
    const csrfToken = getCsrfToken();
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  }

  const opts: RequestInit = { method, headers, credentials: 'include', body: body ? JSON.stringify(body) : undefined };
  let res: Response | undefined;

  const maxAttempts = method === 'GET' ? MAX_RETRIES + 1 : 1;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, RETRY_DELAY));
      res = await fetchWithTimeout(`${API_URL}${path}`, opts);
      break;
    } catch (err) {
      const msg = (err as Error).name === 'AbortError' ? 'Request timed out' : 'Network error — please check your connection';
      if (attempt === maxAttempts - 1) return { success: false, message: msg } as T;
    }
  }

  if (!res) return { success: false, message: 'Request failed' } as T;

  if (!res.ok) {
    if (res.status === 401 && store.get('isAuthenticated') && !path.includes('/auth/login')) {
      store.set('isAuthenticated', false);
      store.set('adminEmail', null);
      sessionStorage.removeItem('bm_token');
      sessionStorage.removeItem('bm_csrf');
      window.location.hash = '/admin/login';
    }
    try {
      const data = await res.json();
      if (res.status === 409) {
        return { success: false, message: 'This email has already submitted an application. We\'ll be in touch soon!' } as T;
      }
      return data;
    } catch {
      return { success: false, message: `Server error (${res.status})` } as T;
    }
  }

  try {
    return await res.json();
  } catch {
    return { success: false, message: 'Invalid response from server' } as T;
  }
}

function buildQuery(params: FilterParams): string {
  const q = new URLSearchParams();
  if (params.userType && params.userType !== 'all') q.set('userType', params.userType);
  if (params.status && params.status !== 'all') q.set('status', params.status);
  if (params.tags) q.set('tags', params.tags);
  if (params.search) q.set('search', params.search);
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.sortBy) q.set('sortBy', params.sortBy);
  if (params.order) q.set('order', params.order);
  const str = q.toString();
  return str ? `?${str}` : '';
}

export const api = {
  async checkBackend(): Promise<boolean> {
    // Render's free tier can cold-start in 30-60s after being idle. A single
    // 5s check was routinely timing out and silently dropping real users into
    // localStorage demo mode with no submissions ever reaching the backend.
    // Two attempts, 20s each, give a cold instance a real chance to wake up.
    const attempt = async (timeoutMs: number): Promise<boolean> => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const r = await fetch(`${API_URL}/health?_t=${Date.now()}`, {
          signal: controller.signal,
          cache: 'no-store',
          headers: { 'Accept': 'application/json' },
        });
        clearTimeout(timer);
        if (!r.ok) return false;
        const text = await r.text();
        try {
          const data = JSON.parse(text);
          return data.success === true;
        } catch {
          return false;
        }
      } catch {
        return false;
      }
    };

    if (await attempt(20000)) return true;
    return attempt(20000);
  },

  // ── Auth ──
  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    if (!store.get('useApi')) {
      if (email && password) return { success: true, data: { token: 'demo_token', expiresIn: '8h' } };
      return { success: false, message: 'Invalid credentials' };
    }
    return request('POST', '/auth/login', { email, password });
  },

  async logout(): Promise<void> {
    if (!store.get('useApi')) return;
    try { await request('POST', '/auth/logout'); } catch { /* ignore */ }
  },

  async verifyToken(): Promise<boolean> {
    if (!store.get('useApi')) return store.get('isAuthenticated');
    try {
      const r = await request<ApiResponse<unknown>>('GET', '/auth/verify');
      return r.success;
    } catch {
      return false;
    }
  },

  // ── Applications ──
  async lookupStatus(refNumber: string, email: string): Promise<ApiResponse<{
    refNumber: string; firstName: string; userType: string; status: string;
    tags: string[]; summitAccess: boolean; allocatedProjects: string[]; submittedAt: string; updatedAt?: string;
  }>> {
    if (store.get('useApi')) return request('POST', '/applications/lookup', { refNumber, email });
    const apps = localStore.get();
    const app = apps.find(a => a.refNumber === refNumber.toUpperCase() && a.personal.email === email.toLowerCase());
    if (!app) return { success: false, message: 'No application found. Please check your reference number and email.' };
    return { success: true, data: {
      refNumber: app.refNumber, firstName: app.personal.firstName, userType: app.userType,
      status: app.status, tags: app.tags, summitAccess: app.dealRoom?.summitAccess || false,
      allocatedProjects: (app as Application & { allocatedProjects?: string[] }).allocatedProjects || [],
      submittedAt: app.submittedAt, updatedAt: app.updatedAt,
    }};
  },

  async submit(payload: SubmitPayload): Promise<ApiResponse<{ refNumber: string }>> {
    if (store.get('useApi')) return request('POST', '/applications', payload);
    const refNumber = generateRefNumber();
    const stubAttachments = (payload.attachments ?? []).map(a => ({
      field: a.field,
      filename: a.filename ?? `demo-${a.field}`,
      storedAs: a.storedAs,
      size: 0,
      mimeType: 'application/octet-stream',
      uploadedAt: new Date().toISOString(),
    }));
    const app: Application = {
      _id: `local_${Date.now()}`,
      refNumber,
      userType: payload.userType,
      personal: payload.personal,
      formData: payload.formData,
      tags: autoTag(payload.userType, payload.formData),
      status: 'new',
      dealRoom: { summitAccess: false, dealRoomEntry: false, funders: [] },
      attachments: stubAttachments.length ? stubAttachments : undefined,
      engagementSource: payload.engagementSource,
      submittedAt: new Date().toISOString(),
    };
    localStore.add(app);
    return { success: true, data: { refNumber } };
  },

  /**
   * Upload a CV/single file to POST /api/applications/upload
   * PUBLIC endpoint — NO Authorization header
   */
  async uploadAttachment(
    file: File,
  ): Promise<ApiResponse<{ filename: string; storedAs: string; size: number; mimeType: string }>> {
    if (!store.get('useApi')) {
      return {
        success: true,
        data: {
          filename: file.name,
          storedAs: `demo-${Date.now()}-${file.name}`,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
        },
      };
    }

    const fd = new FormData();
    fd.append('file', file);

    // ✅ NO Authorization header — public endpoint
    const headers: Record<string, string> = {};
    const csrfToken = getCsrfToken();
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

    try {
      const res = await fetchWithTimeout(`${API_URL}/applications/upload`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: fd,
      });

      let body: Partial<UploadResponse> & { message?: string; code?: string } = {};
      try { body = await res.json(); } catch { /* ignore */ }

      if (!res.ok || !body.success) {
        return { success: false, message: body.message || body.code || `Upload failed (${res.status})` };
      }
      return {
        success: true,
        data: {
          filename: body.filename ?? file.name,
          storedAs: body.storedAs ?? '',
          size: body.size ?? file.size,
          mimeType: body.mimeType ?? (file.type || 'application/octet-stream'),
        },
      };
    } catch (err) {
      const msg = (err as Error).name === 'AbortError' ? 'Upload timed out' : 'Network error — please check your connection';
      return { success: false, message: msg };
    }
  },

  /**
   * Upload a document for multi-document fields (professionals).
   * POST /api/applications/upload-document — public, no auth required.
   * Returns { file: { field, filename, storedAs, size, mimeType, expiryDate } }
   */
  async uploadDocument(
    file: File,
    field: string,
  ): Promise<ApiResponse<{ filename: string; storedAs: string; size: number; mimeType: string; field: string; expiryDate?: string }>> {
    if (!store.get('useApi')) {
      return {
        success: true,
        data: {
          field,
          filename: file.name,
          storedAs: `demo-${Date.now()}-${file.name}`,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          expiryDate: undefined,
        },
      };
    }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('field', field);

    // ✅ NO Authorization header — public endpoint
    // Only CSRF token for security
    const headers: Record<string, string> = {};
    const csrfToken = getCsrfToken();
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

    try {
      const res = await fetchWithTimeout(`${API_URL}/applications/upload-document`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: fd,
      });

      let body: any = {};
      try { body = await res.json(); } catch (e) { console.error('Upload parse error:', e); }

      if (!res.ok || !body.success) {
        console.error('Upload failed response:', body);
        return { 
          success: false, 
          message: body.message || `Upload failed (${res.status})` 
        };
      }

      const f = body.file || body;
      if (!f?.storedAs) {
        return { success: false, message: 'Upload response missing storedAs' };
      }

      return {
        success: true,
        data: {
          field: f.field || field,
          filename: f.filename || file.name,
          storedAs: f.storedAs,
          size: f.size || file.size,
          mimeType: f.mimeType || file.type || 'application/octet-stream',
          expiryDate: f.expiryDate || undefined,
        },
      };
    } catch (err) {
      console.error('Upload network error:', err);
      const msg = (err as Error).name === 'AbortError' ? 'Upload timed out' : 'Network error — please check your connection';
      return { success: false, message: msg };
    }
  },

  async exportMyData(refNumber: string, email: string): Promise<ApiResponse<unknown>> {
    return request('POST', '/applications/data-export', { refNumber, email });
  },

  async deleteMyData(refNumber: string, email: string): Promise<ApiResponse<unknown>> {
    return request('POST', '/applications/data-delete', { refNumber, email, confirm: 'DELETE' });
  },

  async getApplications(params: FilterParams = {}): Promise<PaginatedResponse<Application>> {
    if (store.get('useApi')) return request('GET', `/applications${buildQuery(params)}`);
    let apps = localStore.get();
    if (params.userType && params.userType !== 'all') apps = apps.filter(a => a.userType === params.userType);
    if (params.status && params.status !== 'all') apps = apps.filter(a => a.status === params.status);
    if (params.search) {
      const q = params.search.toLowerCase();
      apps = apps.filter(a =>
        a.personal?.firstName?.toLowerCase().includes(q) ||
        a.personal?.surname?.toLowerCase().includes(q) ||
        a.personal?.email?.toLowerCase().includes(q) ||
        a.refNumber?.toLowerCase().includes(q),
      );
    }
    const page = params.page || 1;
    const limit = params.limit || 50;
    const start = (page - 1) * limit;
    return {
      success: true,
      data: apps.slice(start, start + limit),
      pagination: { total: apps.length, page, limit, pages: Math.ceil(apps.length / limit) },
    };
  },

  async getApplication(id: string): Promise<ApiResponse<Application>> {
    if (store.get('useApi')) return request('GET', `/applications/${id}`);
    const app = localStore.get().find(a => a._id === id);
    return app ? { success: true, data: app } : { success: false, message: 'Not found' };
  },

  async updateApplication(id: string, data: UpdatePayload): Promise<ApiResponse<Application>> {
    if (store.get('useApi')) return request('PATCH', `/applications/${id}`, data);
    localStore.update(id, data as Partial<Application>);
    const app = localStore.get().find(a => a._id === id);
    return { success: true, data: app };
  },

  // ── Professional workload / project allocation ──
  async getProfessionalsWorkload(): Promise<ApiResponse<{
    summary: { total: number; atCapacity: number; available: number; totalActiveProjects: number; averageWorkload: number };
    professionals: Array<{
      id: string; refNumber: string; name: string; status: string;
      activeProjects: number; maxProjects: number; atCapacity: boolean; allocatedProjects: string[];
    }>;
  }>> {
    if (store.get('useApi')) return request('GET', '/applications/professionals/workload');
    const apps = localStore.get().filter(a => a.userType === 'professional');
    const professionals = apps.map(a => ({
      id: a._id, refNumber: a.refNumber,
      name: `${a.personal?.firstName ?? ''} ${a.personal?.surname ?? ''}`.trim(),
      status: a.status,
      activeProjects: a.workload?.activeProjects || 0,
      maxProjects: a.workload?.maxProjects || 5,
      atCapacity: (a.workload?.activeProjects || 0) >= (a.workload?.maxProjects || 5),
      allocatedProjects: a.allocatedProjects || [],
    }));
    const summary = {
      total: professionals.length,
      atCapacity: professionals.filter(p => p.atCapacity).length,
      available: professionals.filter(p => !p.atCapacity).length,
      totalActiveProjects: professionals.reduce((sum, p) => sum + p.activeProjects, 0),
      averageWorkload: professionals.length
        ? Math.round((professionals.reduce((sum, p) => sum + p.activeProjects, 0) / professionals.length) * 10) / 10
        : 0,
    };
    return { success: true, data: { summary, professionals } };
  },

  async assignProject(id: string, projectId: string): Promise<ApiResponse<Application>> {
    if (store.get('useApi')) return request('POST', `/applications/${id}/assign-project`, { projectId });
    const app = localStore.get().find(a => a._id === id);
    if (!app) return { success: false, message: 'Not found' };
    if (!['invited', 'funded'].includes(app.status)) {
      return { success: false, message: 'Professional must be onboarded to the panel before a project can be assigned' };
    }
    const workload = app.workload || { activeProjects: 0, maxProjects: 5, projectHistory: [] };
    if ((workload.activeProjects || 0) >= (workload.maxProjects || 5)) {
      return { success: false, message: `Professional is at capacity (${workload.maxProjects || 5} projects max)` };
    }
    if ((app.allocatedProjects || []).includes(projectId)) {
      return { success: false, message: 'Project already assigned to this professional' };
    }
    const updated: Partial<Application> = {
      allocatedProjects: [...(app.allocatedProjects || []), projectId],
      workload: {
        activeProjects: (workload.activeProjects || 0) + 1,
        maxProjects: workload.maxProjects || 5,
        projectHistory: [...(workload.projectHistory || []), { projectId, allocatedAt: new Date().toISOString(), status: 'active' }],
      },
    };
    localStore.update(id, updated);
    return { success: true, data: localStore.get().find(a => a._id === id) };
  },

  async completeProject(id: string, projectId: string): Promise<ApiResponse<Application>> {
    if (store.get('useApi')) return request('POST', `/applications/${id}/complete-project`, { projectId });
    const app = localStore.get().find(a => a._id === id);
    if (!app) return { success: false, message: 'Not found' };
    if (!(app.allocatedProjects || []).includes(projectId)) {
      return { success: false, message: 'Project is not currently assigned to this professional' };
    }
    const workload = app.workload || { activeProjects: 0, maxProjects: 5, projectHistory: [] };
    const updated: Partial<Application> = {
      allocatedProjects: (app.allocatedProjects || []).filter(p => p !== projectId),
      workload: {
        activeProjects: Math.max(0, (workload.activeProjects || 0) - 1),
        maxProjects: workload.maxProjects || 5,
        projectHistory: (workload.projectHistory || []).map(p =>
          p.projectId === projectId ? { ...p, status: 'completed' as const, completedAt: new Date().toISOString() } : p
        ),
      },
    };
    localStore.update(id, updated);
    return { success: true, data: localStore.get().find(a => a._id === id) };
  },

  async getStats(): Promise<ApiResponse<StatsData>> {
    if (store.get('useApi')) return request('GET', '/applications/stats');
    const apps = localStore.get();
    const byType = Object.entries(apps.reduce<Record<string, number>>((acc, a) => { acc[a.userType] = (acc[a.userType] || 0) + 1; return acc; }, {})).map(([_id, count]) => ({ _id, count }));
    const byStatus = Object.entries(apps.reduce<Record<string, number>>((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {})).map(([_id, count]) => ({ _id, count }));
    const tagCounts: Record<string, number> = {};
    apps.forEach(a => a.tags?.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
    const byTag = Object.entries(tagCounts).map(([_id, count]) => ({ _id, count }));
    const sourceCounts: Record<string, number> = {};
    apps.forEach(a => { const s = a.engagementSource as string || 'direct'; sourceCounts[s] = (sourceCounts[s] || 0) + 1; });
    const bySource = Object.entries(sourceCounts).map(([_id, count]) => ({ _id, count }));
    const classCounts: Record<string, number> = {};
    apps.forEach(a => { const c = a.classification as string || 'unclassified'; classCounts[c] = (classCounts[c] || 0) + 1; });
    const byClassification = Object.entries(classCounts).map(([_id, count]) => ({ _id, count }));
    return { success: true, data: { total: apps.length, byType, byStatus, byTag, bySource, byClassification, recentApps: apps.slice(0, 8) } };
  },

  // ── Analytics ──
  async getAnalyticsDashboard(range = '30d'): Promise<ApiResponse<AnalyticsDashboard>> {
    return request('GET', `/insights/dashboard?range=${range}`);
  },
  async getAnalyticsFunnel(): Promise<ApiResponse<FunnelData>> {
    return request('GET', '/insights/funnel');
  },
  async getAnalyticsTrends(granularity = 'day', range = '30d'): Promise<ApiResponse<TrendData>> {
    return request('GET', `/insights/trends?granularity=${granularity}&range=${range}`);
  },
  async getAnalyticsTags(): Promise<ApiResponse<TagAnalytics>> {
    return request('GET', '/insights/tags');
  },
  async getAnalyticsDemographics(): Promise<ApiResponse<DemographicsData>> {
    return request('GET', '/insights/demographics');
  },
  async getAnalyticsDealRoom(): Promise<ApiResponse<DealRoomAnalytics>> {
    return request('GET', '/insights/deal-room');
  },

  // ── Traffic Analytics ──
  async getTrafficOverview(range = '30d'): Promise<ApiResponse<TrafficOverview>> {
    return request('GET', `/insights/traffic?range=${range}`);
  },
  async getTrafficTrends(granularity = 'day', range = '30d'): Promise<ApiResponse<TrafficTrends>> {
    return request('GET', `/insights/traffic/trends?granularity=${granularity}&range=${range}`);
  },
  async getTrafficReferrers(range = '30d'): Promise<ApiResponse<ReferrerData>> {
    return request('GET', `/insights/traffic/referrers?range=${range}`);
  },
  async getTrafficDevices(range = '30d'): Promise<ApiResponse<DeviceData>> {
    return request('GET', `/insights/traffic/devices?range=${range}`);
  },
  async getTrafficHours(range = '30d'): Promise<ApiResponse<HourlyData>> {
    return request('GET', `/insights/traffic/hours?range=${range}`);
  },
  async getTrafficFormFunnel(range = '30d'): Promise<ApiResponse<FormFunnelData>> {
    return request('GET', `/insights/traffic/form-funnel?range=${range}`);
  },
  async getTrafficClicks(range = '30d'): Promise<ApiResponse<ClickData>> {
    return request('GET', `/insights/traffic/clicks?range=${range}`);
  },

  async getAuditLog(queryString: string): Promise<PaginatedResponse<unknown>> {
    return request('GET', `/insights/events?${queryString}`);
  },

  // ── Settings ──
  async getSetting(key: string): Promise<ApiResponse<{ key: string; value: unknown }>> {
    return request('GET', `/settings/public/${key}`);
  },
  async getAllSettings(): Promise<ApiResponse<Record<string, unknown>>> {
    return request('GET', '/settings');
  },
  async updateSetting(key: string, value: unknown): Promise<ApiResponse<unknown>> {
    return request('PUT', `/settings/${key}`, { value });
  },

  async bulkUpdateStatus(ids: string[], status: string): Promise<ApiResponse<{ updated: number }>> {
    return request('POST', '/applications/bulk-status', { ids, status });
  },

  async sendReminders(ids: string[]): Promise<ApiResponse<{ sent: number }>> {
    return request('POST', '/applications/send-reminders', { ids });
  },

  async getReport(name: ReportName): Promise<ApiResponse<ReportData>> {
    if (store.get('useApi')) return request('GET', `/reports/${name}`);
    const apps = localStore.get();
    const filters: Record<string, (a: Application) => boolean> = {
      'high-value-developers': a => a.tags?.some(t => ['HIGH_VALUE', 'LARGE_CAPITAL'].includes(t)) ?? false,
      'pipeline-ready-developers': a => a.tags?.includes('PIPELINE_READY') ?? false,
      'pipeline-ready-land': a => a.tags?.includes('PIPELINE_READY') ?? false,
      'institutional-grade-housing': a => a.tags?.includes('INSTITUTIONAL_GRADE') ?? false,
      'deal-room-shortlist': a => ['shortlisted', 'invited'].includes(a.status),
    };
    const filtered = apps.filter(filters[name] || (() => false));
    return { success: true, data: { report: name, description: '', count: filtered.length, data: filtered } };
  },

  // ── Admins ──
  async getAdmins(): Promise<ApiResponse<unknown[]>> {
    return request('GET', '/admins');
  },
  async createAdmin(data: { email: string; password: string; name?: string }): Promise<ApiResponse<unknown>> {
    return request('POST', '/admins', data);
  },
  async updateAdmin(id: string, data: { email?: string; password?: string; name?: string }): Promise<ApiResponse<unknown>> {
    return request('PATCH', `/admins/${id}`, data);
  },
  // ── Document verification ──
  async verifyAttachment(
    refNumber: string,
    storedAs: string,
    approved: boolean,
    rejectionReason?: string,
  ): Promise<ApiResponse<Application>> {
    return request('POST', `/applications/${encodeURIComponent(refNumber)}/attachment/${encodeURIComponent(storedAs)}/verify`, {
      approved,
      rejectionReason,
    });
  },

  async deleteAdmin(id: string): Promise<ApiResponse<unknown>> {
    return request('DELETE', `/admins/${id}`);
  },
};