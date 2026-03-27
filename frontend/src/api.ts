import type {
  ApiResponse, PaginatedResponse, StatsData, LoginResponse, ReportData,
  Application, SubmitPayload, UpdatePayload, FilterParams, ReportName,
  AnalyticsDashboard, FunnelData, TrendData, TagAnalytics, DemographicsData, DealRoomAnalytics,
} from './types/index.ts';
import { store, localStore } from './store.ts';
import { autoTag } from './utils/auto-tag.ts';
import { generateRefNumber } from './utils/format.ts';

const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = store.get('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { success: false, message: 'Network error — please check your connection' } as T;
  }

  if (!res.ok) {
    try {
      return await res.json();
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
      const r = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(2000) });
      return r.ok;
    } catch {
      return false;
    }
  },

  // ── Auth ──
  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    if (!store.get('useApi')) {
      if (email === 'admin@bemore.co.za' && password === 'BeMore@2026!') {
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
    return { success: true, data: { total: apps.length, byType, byStatus, byTag, recentApps: apps.slice(0, 8) } };
  },

  // ── Analytics ──
  async getAnalyticsDashboard(range = '30d'): Promise<ApiResponse<AnalyticsDashboard>> {
    return request('GET', `/analytics/dashboard?range=${range}`);
  },
  async getAnalyticsFunnel(): Promise<ApiResponse<FunnelData>> {
    return request('GET', '/analytics/funnel');
  },
  async getAnalyticsTrends(granularity = 'day', range = '30d'): Promise<ApiResponse<TrendData>> {
    return request('GET', `/analytics/trends?granularity=${granularity}&range=${range}`);
  },
  async getAnalyticsTags(): Promise<ApiResponse<TagAnalytics>> {
    return request('GET', '/analytics/tags');
  },
  async getAnalyticsDemographics(): Promise<ApiResponse<DemographicsData>> {
    return request('GET', '/analytics/demographics');
  },
  async getAnalyticsDealRoom(): Promise<ApiResponse<DealRoomAnalytics>> {
    return request('GET', '/analytics/deal-room');
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
};
