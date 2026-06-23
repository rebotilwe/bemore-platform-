/**
 * Routing types for the BeMore platform
 * Department routing for Pormat Sales, Pormat Management, and Muma Consulting
 */

export type RoutingDepartment = 
  | 'pormat_sales'
  | 'pormat_management'
  | 'muma_consulting'
  | 'unassigned';

export type RoutingStatus = 
  | 'pending'
  | 'assigned'
  | 'reviewed'
  | 'completed';

export type LeadType = 
  | 'development_project'
  | 'land'
  | 'investment'
  | 'student_accommodation'
  | 'consultant_panel'
  | 'aspiring_developer'
  | 'general';

export interface RoutingInfo {
  department: RoutingDepartment;
  leadType: LeadType;
  priority: 'high' | 'medium' | 'low';
  assignedTo?: string;
  assignedAt?: string;
  status: RoutingStatus;
  note?: string;
}

// Department display names
export const DEPARTMENT_DISPLAY_NAMES: Record<RoutingDepartment, string> = {
  pormat_sales: 'Pormat Sales',
  pormat_management: 'Pormat Management',
  muma_consulting: 'Muma Consulting',
  unassigned: 'Unassigned',
};

// Department email addresses (for notifications)
export const DEPARTMENT_EMAILS: Record<RoutingDepartment, string> = {
  pormat_sales: 'sales@pormat.co.za',
  pormat_management: 'management@pormat.co.za',
  muma_consulting: 'consulting@muma.co.za',
  unassigned: 'admin@bemore.co.za',
};

// Lead type display names
export const LEAD_TYPE_DISPLAY_NAMES: Record<LeadType, string> = {
  development_project: 'Development Project',
  land: 'Land Opportunity',
  investment: 'Investment Opportunity',
  student_accommodation: 'Student Accommodation',
  consultant_panel: 'Consultant Panel',
  aspiring_developer: 'Aspiring Developer',
  general: 'General Lead',
};