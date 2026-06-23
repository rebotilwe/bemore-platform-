export type {
  ProfileCategory, ApplicationStatus, FunderName, ReportName, Classification, FollowUp,
  Personal, DealRoom, Application, SubmitPayload, UpdatePayload, FilterParams,
  AttachmentRef, AttachmentRecord, UploadResponse,
} from './application.ts';

// NEW: Export routing types
export type {
  RoutingInfo,
  RoutingDepartment,
  RoutingStatus,
  LeadType,
} from './routing.ts';

// NEW: Export workload types
export type {
  WorkloadInfo,
  ProjectHistory,
} from './workload.ts';

export type {
  ApiResponse, PaginatedResponse, StatsData, LoginResponse, ReportData, TypeCount,
  AnalyticsDashboard, FunnelData, TrendData, TagAnalytics, DemographicsData, DealRoomAnalytics,
  TrafficOverview, TrafficTrends, ReferrerData, DeviceData, HourlyData, FormFunnelData, ClickData,
} from './api.ts';

export type { Page, LayoutType, RouteConfig } from './routes.ts';