export type ProfileCategory = 'developer' | 'landowner' | 'investor' | 'student' | 'professional' | 'aspiring';
export type ApplicationStatus = 'new' | 'reviewing' | 'shortlisted' | 'invited' | 'funded';

// Updated: Replaced PBSA with actual institutional funders
export type FunderName = 'DBSA' | 'NHFC' | 'NEF' | 'SAIF';

export type ReportName = 'high-value-developers' | 'pipeline-ready-developers' | 'pipeline-ready-land' | 'institutional-grade-housing' | 'deal-room-shortlist';

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

/** Attachment metadata returned by POST /api/applications/upload + persisted on
 *  the parent Application after a successful POST /api/applications. The
 *  frontend only needs to send `field` + `storedAs` (+ optional `filename`) on
 *  submission — the backend re-derives size + mimeType from disk. */
export interface AttachmentRef {
  field: string;
  storedAs: string;
  filename?: string;
}

/** Full attachment record as persisted on the Application document. */
export interface AttachmentRecord extends AttachmentRef {
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt?: string;
  expiryDate?: string; // NEW: Document expiry tracking
  isVerified?: boolean; // NEW: Document verification status
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
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
  attachments?: AttachmentRecord[];
  /** Project refs assigned to this applicant. Populated for Built Environment
   *  Professionals via the project allocation endpoints. */
  allocatedProjects?: string[];
  /** POPIA audit trail captured at submission. Optional for compatibility
   *  with applications submitted before 2026-05-11. */
  consent?: { tc?: boolean; popia?: boolean; capturedAt?: string };
  // NEW: Routing information
  routing?: {
    department?: 'pormat_sales' | 'pormat_management' | 'muma_consulting' | 'unassigned';
    leadType?: string;
    assignedTo?: string;
    assignedAt?: string;
    status?: 'pending' | 'assigned' | 'reviewed' | 'completed';
  };
  // NEW: Professional workload tracking
  workload?: {
    activeProjects?: number;
    maxProjects?: number;
    projectHistory?: Array<{
      projectId: string;
      allocatedAt: string;
      completedAt?: string;
      status: 'active' | 'completed' | 'archived';
    }>;
  };
  submittedAt: string;
  updatedAt?: string;
}

export interface SubmitPayload {
  userType: ProfileCategory;
  personal: Personal;
  formData: Record<string, unknown>;
  attachments?: AttachmentRef[];
  engagementSource?: string;
  consent?: Record<string, unknown>;
}

/** Response shape from POST /api/applications/upload (spec §8.1).
 *  The endpoint returns these fields at the top level (no `data` wrapper). */
export interface UploadResponse {
  success: true;
  filename: string;
  storedAs: string;
  size: number;
  mimeType: string;
  field?: string;
  expiryDate?: string;
}

export interface UpdatePayload {
  status?: ApplicationStatus;
  dealRoom?: Partial<DealRoom>;
  classification?: Classification;
  followUp?: Partial<FollowUp>;
  adminNotes?: string;
  allocatedProjects?: string[];
  // NEW: Routing updates
  routing?: {
    department?: 'pormat_sales' | 'pormat_management' | 'muma_consulting' | 'unassigned';
    status?: 'pending' | 'assigned' | 'reviewed' | 'completed';
  };
  // NEW: Workload updates
  workload?: {
    activeProjects?: number;
    maxProjects?: number;
  };
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