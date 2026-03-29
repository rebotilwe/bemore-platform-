export type ProfileCategory = 'developer' | 'landowner' | 'investor' | 'student' | 'professional' | 'aspiring';
export type ApplicationStatus = 'new' | 'reviewing' | 'shortlisted' | 'invited' | 'funded';
export type FunderName = 'PBSA';
export type ReportName = 'high-value-developers' | 'pipeline-ready-land' | 'institutional-grade-housing' | 'deal-room-shortlist';

export interface Personal {
  firstName: string;
  surname: string;
  email: string;
  phone: string;
  companyName?: string;
}

export interface DealRoom {
  summitAccess: boolean;
  dealRoomEntry: boolean;
  funders: FunderName[];
  notes?: string;
}

export type Classification = 'hot' | 'warm' | 'cold' | 'unclassified';

export interface FollowUp {
  required: boolean;
  dueDate?: string;
  notes?: string;
  completedAt?: string;
}

export interface Application {
  _id: string;
  refNumber: string;
  userType: ProfileCategory;
  personal: Personal;
  formData: Record<string, unknown>;
  tags: string[];
  status: ApplicationStatus;
  dealRoom: DealRoom;
  engagementSource?: string;
  classification?: Classification;
  followUp?: FollowUp;
  adminNotes?: string;
  submittedAt: string;
  updatedAt?: string;
}

export interface SubmitPayload {
  userType: ProfileCategory;
  personal: Personal;
  formData: Record<string, unknown>;
}

export interface UpdatePayload {
  status?: ApplicationStatus;
  dealRoom?: Partial<DealRoom>;
  classification?: Classification;
  followUp?: Partial<FollowUp>;
  adminNotes?: string;
}

export interface FilterParams {
  userType?: string;
  status?: string;
  tags?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}
