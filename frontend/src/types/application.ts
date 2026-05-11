export type ProfileCategory = 'developer' | 'landowner' | 'investor' | 'student' | 'professional' | 'aspiring';
export type ApplicationStatus = 'new' | 'reviewing' | 'shortlisted' | 'invited' | 'funded';
export type FunderName = 'PBSA';
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
  /** POPIA audit trail captured at submission. Optional for compatibility
   *  with applications submitted before 2026-05-11. */
  consent?: { tc?: boolean; popia?: boolean; capturedAt?: string };
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
