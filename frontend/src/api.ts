import type {
  ApiResponse, PaginatedResponse, StatsData, LoginResponse, ReportData,
  Application, SubmitPayload, UpdatePayload, FilterParams, ReportName,
  AnalyticsDashboard, FunnelData, TrendData, TagAnalytics, DemographicsData, DealRoomAnalytics,
} from './types/index.ts';
import { store, localStore } from './store.ts';
import { autoTag } from './utils/auto-tag.ts';
import { generateRefNumber } from './utils/format.ts';

// Always use relative /api path — Vercel rewrites it to the Railway backend.
// Using the Railway URL directly causes CORS preflight failures.
const API_URL = '/api';

const REQUEST_TIMEOUT = 15000; // 15 seconds
const RETRY_DELAY = 2000;
const MAX_RETRIES = 1; // 1 retry for GET on network error

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

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = store.get('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts: RequestInit = { method, headers, body: body ? JSON.stringify(body) : undefined };
  let res: Response | undefined;

  // Retry loop (only retries GET on network/timeout errors)
  const maxAttempts = method === 'GET' ? MAX_RETRIES + 1 : 1;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, RETRY_DELAY));
      res = await fetchWithTimeout(`${API_URL}${path}`, opts);
      break;
    } catch (err) {
      const msg = (err as Error).name === 'AbortError' ? 'Request timed out' : 'Network error — please check your connection';
      if (attempt === maxAttempts - 1) {
        return { success: false, message: msg } as T;
      }
    }
  }

  if (!res) return { success: false, message: 'Request failed' } as T;

  if (!res.ok) {
    // Auto-logout on expired/invalid token
    if (res.status === 401 && store.get('token') && !path.includes('/auth/login')) {
      store.set('token', '');
      store.set('isAuthenticated', false);
      window.location.hash = '/admin/login';
    }

    try {
      const data = await res.json();
      if (res.status === 409) {
        return {
          success: false,
          message: 'This email has already submitted an application. We\'ll be in touch soon!'
        } as T;
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
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
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
        return false; // Got HTML instead of JSON
      }
    } catch {
      return false;
    }
  },

  // ── Auth ──
  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    if (!store.get('useApi')) {
      if (email && password) {
        return { success: true, data: { token: 'demo_token', expiresIn: '8h' } };
      }
      return { success: false, message: 'Invalid credentials' };
    }
    return request('POST', '/auth/login', { email, password });
  },

  async verifyToken(): Promise<boolean> {
    if (!store.get('useApi')) return !!store.get('token');
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
    tags: string[]; summitAccess: boolean; submittedAt: string; updatedAt?: string;
  }>> {
    if (store.get('useApi')) {
      return request('POST', '/applications/lookup', { refNumber, email });
    }
    const apps = localStore.get();
    const app = apps.find(a => a.refNumber === refNumber.toUpperCase() && a.personal.email === email.toLowerCase());
    if (!app) return { success: false, message: 'No application found. Please check your reference number and email.' };
    return { success: true, data: {
      refNumber: app.refNumber, firstName: app.personal.firstName, userType: app.userType,
      status: app.status, tags: app.tags, summitAccess: app.dealRoom?.summitAccess || false,
      submittedAt: app.submittedAt, updatedAt: app.updatedAt,
    }};
  },

  async submit(payload: SubmitPayload): Promise<ApiResponse<{ refNumber: string }>> {
    if (store.get('useApi')) {
      return request('POST', '/applications', payload);
    }
    const refNumber = generateRefNumber();
    const app: Application = {
      _id: `local_${Date.now()}`,
      refNumber,
      userType: payload.userType,
      personal: payload.personal,
      formData: payload.formData,
      tags: autoTag(payload.userType, payload.formData),
      status: 'new',
      dealRoom: { summitAccess: false, dealRoomEntry: false, funders: [] },
      submittedAt: new Date().toISOString(),
    };
    localStore.add(app);
    return { success: true, data: { refNumber } };
  },

  async exportMyData(refNumber: string, email: string): Promise<ApiResponse<unknown>> {
    return request('POST', '/applications/data-export', { refNumber, email });
  },

  async deleteMyData(refNumber: string, email: string): Promise<ApiResponse<unknown>> {
    return request('POST', '/applications/data-delete', { refNumber, email, confirm: 'DELETE' });
  },

  async getApplications(params: FilterParams = {}): Promise<PaginatedResponse<Application>> {
    if (store.get('useApi')) {
      return request('GET', `/applications${buildQuery(params)}`);
    }
    let apps = localStore.get();
    if (params.userType && params.userType !== 'all') apps = apps.filter(a => a.userType === params.userType);
    if (params.status && params.status !== 'all') apps = apps.filter(a => a.status === params.status);
    if (params.search) {
      const q = params.search.toLowerCase();
      apps = apps.filter(a =>
        a.personal?.firstName?.toLowerCase().includes(q) ||
        a.personal?.surname?.toLowerCase().includes(q) ||
        a.personal?.email?.toLowerCase().includes(q) ||
        a.refNumber?.toLowerCase().includes(q)
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
      'pipeline-ready-land': a => a.tags?.includes('PIPELINE_READY') ?? false,
      'institutional-grade-housing': a => a.tags?.includes('INSTITUTIONAL_GRADE') ?? false,
      'deal-room-shortlist': a => ['shortlisted', 'invited'].includes(a.status),
    };
    const filtered = apps.filter(filters[name] || (() => false));
    return { success: true, data: { report: name, description: '', count: filtered.length, data: filtered } };
  },

  // ── Polls ──
  async getActivePoll(): Promise<ApiResponse<unknown>> {
    return request('GET', '/polls/active');
  },
  async pollVote(pollId: string, data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    return request('POST', `/polls/${pollId}/vote`, data);
  },
  async getPolls(status?: string): Promise<ApiResponse<unknown[]>> {
    const qs = status ? `?status=${status}` : '';
    return request('GET', `/polls${qs}`);
  },
  async createPoll(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    return request('POST', '/polls', data);
  },
  async updatePoll(id: string, data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    return request('PATCH', `/polls/${id}`, data);
  },
  async setPollStatus(id: string, status: string): Promise<ApiResponse<unknown>> {
    return request('PATCH', `/polls/${id}/status`, { status });
  },
  async setPollActiveQuestion(id: string, questionIndex: number): Promise<ApiResponse<unknown>> {
    return request('PATCH', `/polls/${id}/activate`, { questionIndex });
  },
  async getPollResults(id: string): Promise<ApiResponse<unknown>> {
    return request('GET', `/polls/${id}/results`);
  },
  async deletePoll(id: string): Promise<ApiResponse<unknown>> {
    return request('DELETE', `/polls/${id}`);
  },
};
