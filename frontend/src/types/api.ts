import type { Application } from './application.ts';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message?: string;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface TypeCount {
  _id: string;
  count: number;
}

export interface StatsData {
  total: number;
  byType: TypeCount[];
  byStatus: TypeCount[];
  byTag: TypeCount[];
  bySource: TypeCount[];
  byClassification: TypeCount[];
  recentApps: Application[];
}

export interface LoginResponse {
  token: string;
  expiresIn: string;
  csrfToken?: string;
}

export interface ReportData {
  report: string;
  description: string;
  count: number;
  data: Application[];
}

// ── Analytics types ──
export interface AnalyticsDashboard {
  totalApplications: number;
  applicationsByPeriod: { _id: string; count: number }[];
  eventCounts: TypeCount[];
  topEvents: TypeCount[];
  dateRange: { start: string; end: string };
}

export interface FunnelData {
  byStatus: TypeCount[];
  byType: TypeCount[];
  funnel: { new: number; reviewing: number; shortlisted: number; invited: number; funded: number };
}

export interface TrendData {
  granularity: string;
  dateRange: { start: string; end: string };
  data: { period: string; total: number; byType: Record<string, number> }[];
}

export interface TagAnalytics {
  tagDistribution: TypeCount[];
  tagCoOccurrence: { _id: { tag1: string; tag2: string }; count: number }[];
  tagsByType: { _id: string; tags: { tag: string; count: number }[] }[];
}

export interface DemographicsData {
  byType: (TypeCount & { avgTags: number })[];
  byValue: TypeCount[];
  byFundingHistory: TypeCount[];
  byLandStatus: TypeCount[];
}

// ── Traffic analytics types ──
export interface TrafficOverview {
  pageViews: number;
  uniqueVisitors: number;
  uniqueSessions: number;
  avgDuration: number;
  bounceRate: number;
  topPages: TypeCount[];
  dateRange: { start: string; end: string };
}

export interface TrafficTrends {
  granularity: string;
  data: { period: string; views: number; uniqueVisitors: number }[];
  dateRange: { start: string; end: string };
}

export interface ReferrerData {
  referrers: TypeCount[];
  utmSources: TypeCount[];
}

export interface DeviceData {
  byDeviceType: TypeCount[];
  byBrowser: TypeCount[];
  byOS: TypeCount[];
}

export interface HourlyData {
  data: { _id: { day: number; hour: number }; count: number }[];
}

export interface FormFunnelData {
  steps: TypeCount[];
}

export interface ClickData {
  clicks: TypeCount[];
}

export interface DealRoomAnalytics {
  summitAccess: number;
  dealRoomEntry: number;
  funderDistribution: TypeCount[];
  funderPipeline: { _id: string; count: number; withSummitAccess: number; withDealRoom: number; avgFunders: number }[];
}