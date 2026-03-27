import type { Application } from './application.ts';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
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
  recentApps: Application[];
}

export interface LoginResponse {
  token: string;
  expiresIn: string;
}

export interface ReportData {
  report: string;
  description: string;
  count: number;
  data: Application[];
}
