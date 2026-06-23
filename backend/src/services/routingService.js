/**
 * Routing Service — Department routing logic for the BeMore platform
 * 
 * Spec: Muma + Pormat dual-brand model (Spec V4)
 * Date: 22 June 2026
 */

import { getRoutingInfo, getDepartmentEmail, getDepartmentName, DEPARTMENTS } from '../constants/routing.js';
import logger from '../utils/logger.js';

/**
 * Route an application to the appropriate department based on user type and form data
 */
export function routeApplication(application) {
  const { userType, formData, refNumber } = application;
  
  // Get routing info based on user type and form data
  const routingInfo = getRoutingInfo(userType, formData);
  
  // Update application with routing information
  application.routing = {
    department: routingInfo.department,
    leadType: routingInfo.leadType,
    assignedTo: null,
    assignedAt: null,
    status: 'pending',
  };
  
  logger.info('Application routed', {
    refNumber,
    userType,
    department: routingInfo.department,
    leadType: routingInfo.leadType,
    priority: routingInfo.priority,
  });
  
  return {
    application,
    routingInfo,
  };
}

/**
 * Get department email for notification
 */
export function getRouteNotification(application) {
  const { routing, refNumber, personal } = application;
  const department = routing?.department || DEPARTMENTS.UNASSIGNED;
  const email = getDepartmentEmail(department);
  const departmentName = getDepartmentName(department);
  
  return {
    to: email,
    department: departmentName,
    subject: `New ${departmentName} Lead - ${refNumber}`,
    data: {
      refNumber,
      applicantName: `${personal.firstName} ${personal.surname}`,
      applicantEmail: personal.email,
      applicantPhone: personal.phone,
      department: departmentName,
      leadType: routing?.leadType || 'General',
      status: routing?.status || 'pending',
    },
  };
}

/**
 * Check if a professional is at capacity
 */
export function isProfessionalAtCapacity(application, maxProjects = 5) {
  const activeProjects = application.workload?.activeProjects || 0;
  return activeProjects >= maxProjects;
}

/**
 * Assign a project to a professional
 */
export function assignProjectToProfessional(application, projectId) {
  if (isProfessionalAtCapacity(application)) {
    throw new Error(`Professional is at capacity (${application.workload.maxProjects} projects max)`);
  }
  
  if (!application.workload) {
    application.workload = {
      activeProjects: 0,
      maxProjects: 5,
      projectHistory: [],
    };
  }
  
  application.workload.activeProjects += 1;
  application.workload.projectHistory.push({
    projectId,
    allocatedAt: new Date(),
    status: 'active',
  });
  
  // Add to allocated projects list
  if (!application.allocatedProjects) {
    application.allocatedProjects = [];
  }
  application.allocatedProjects.push(projectId);
  
  logger.info('Project assigned to professional', {
    refNumber: application.refNumber,
    projectId,
    activeProjects: application.workload.activeProjects,
  });
  
  return application;
}

/**
 * Complete a project for a professional
 */
export function completeProjectForProfessional(application, projectId) {
  if (!application.workload) {
    return application;
  }
  
  // Update project history
  const project = application.workload.projectHistory.find(p => p.projectId === projectId);
  if (project) {
    project.completedAt = new Date();
    project.status = 'completed';
  }
  
  // Decrement active projects
  application.workload.activeProjects = Math.max(0, application.workload.activeProjects - 1);
  
  // Remove from allocated projects
  application.allocatedProjects = application.allocatedProjects.filter(id => id !== projectId);
  
  logger.info('Project completed for professional', {
    refNumber: application.refNumber,
    projectId,
    activeProjects: application.workload.activeProjects,
  });
  
  return application;
}

/**
 * Get professional workload summary
 */
export function getProfessionalWorkloadSummary(applications) {
  const summary = {
    total: applications.length,
    atCapacity: 0,
    available: 0,
    totalActiveProjects: 0,
    averageWorkload: 0,
  };
  
  let totalWorkload = 0;
  
  for (const app of applications) {
    const active = app.workload?.activeProjects || 0;
    totalWorkload += active;
    summary.totalActiveProjects += active;
    
    if (active >= (app.workload?.maxProjects || 5)) {
      summary.atCapacity += 1;
    } else {
      summary.available += 1;
    }
  }
  
  summary.averageWorkload = summary.total > 0 
    ? Math.round((totalWorkload / summary.total) * 10) / 10 
    : 0;
  
  return summary;
}