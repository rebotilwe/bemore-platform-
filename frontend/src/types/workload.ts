/**
 * Workload types for the BeMore platform
 * Professional workload tracking (max 5 projects)
 */

export interface ProjectHistory {
  projectId: string;
  projectName?: string;
  allocatedAt: string;
  completedAt?: string;
  status: 'active' | 'completed' | 'archived';
}

export interface WorkloadInfo {
  activeProjects: number;
  maxProjects: number;
  projectHistory: ProjectHistory[];
  isAtCapacity: boolean;
}

// Default workload configuration
export const DEFAULT_WORKLOAD_CONFIG = {
  maxProjects: 5,
};