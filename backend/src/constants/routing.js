/**
 * Routing Constants — Department routing rules for the BeMore platform
 * 
 * Spec: Muma + Pormat dual-brand model (Spec V4)
 * Date: 22 June 2026
 */

// Department definitions
export const DEPARTMENTS = {
  PORMAT_SALES: 'pormat_sales',
  PORMAT_MANAGEMENT: 'pormat_management',
  MUMA_CONSULTING: 'muma_consulting',
  UNASSIGNED: 'unassigned',
};

export const DEPARTMENT_NAMES = {
  [DEPARTMENTS.PORMAT_SALES]: 'Pormat Sales',
  [DEPARTMENTS.PORMAT_MANAGEMENT]: 'Pormat Management',
  [DEPARTMENTS.MUMA_CONSULTING]: 'Muma Consulting',
  [DEPARTMENTS.UNASSIGNED]: 'Unassigned',
};

export const DEPARTMENT_EMAILS = {
  [DEPARTMENTS.PORMAT_SALES]: 'sales@pormat.co.za', // Replace with actual
  [DEPARTMENTS.PORMAT_MANAGEMENT]: 'management@pormat.co.za', // Replace with actual
  [DEPARTMENTS.MUMA_CONSULTING]: 'consulting@muma.co.za', // Replace with actual
  [DEPARTMENTS.UNASSIGNED]: 'admin@bemore.co.za', // Replace with actual
};

// Routing rules based on user type and form data
export const ROUTING_RULES = {
  developer: {
    department: DEPARTMENTS.MUMA_CONSULTING,
    leadType: 'development_project',
    priority: 'high',
    notification: {
      subject: 'New Developer Application - {{refNumber}}',
      template: 'developer-application',
    },
  },
  landowner: {
    department: (formData) => {
      // If landowner wants to sell → Pormat Sales
      if (formData?.landOutcome === 'sell') {
        return DEPARTMENTS.PORMAT_SALES;
      }
      // If landowner wants to develop → Muma Consulting
      if (formData?.landOutcome === 'develop' || formData?.landOutcome === 'partner') {
        return DEPARTMENTS.MUMA_CONSULTING;
      }
      // Default to Muma Consulting
      return DEPARTMENTS.MUMA_CONSULTING;
    },
    leadType: 'land',
    priority: 'high',
    notification: {
      subject: 'New Landowner Application - {{refNumber}}',
      template: 'landowner-application',
    },
  },
  investor: {
    department: DEPARTMENTS.MUMA_CONSULTING,
    leadType: 'investment',
    priority: 'medium',
    notification: {
      subject: 'New Investor Application - {{refNumber}}',
      template: 'investor-application',
    },
  },
  student: {
    department: DEPARTMENTS.PORMAT_MANAGEMENT,
    leadType: 'student_accommodation',
    priority: 'high',
    notification: {
      subject: 'New Student Accommodation Application - {{refNumber}}',
      template: 'student-application',
    },
  },
  professional: {
    department: DEPARTMENTS.MUMA_CONSULTING,
    leadType: 'consultant_panel',
    priority: 'medium',
    notification: {
      subject: 'New Professional Application - {{refNumber}}',
      template: 'professional-application',
    },
  },
  aspiring: {
    department: DEPARTMENTS.MUMA_CONSULTING,
    leadType: 'aspiring_developer',
    priority: 'low',
    notification: {
      subject: 'New Aspiring Developer Application - {{refNumber}}',
      template: 'aspiring-application',
    },
  },
};

// Lead type display names
export const LEAD_TYPES = {
  development_project: 'Development Project',
  land: 'Land Opportunity',
  investment: 'Investment Opportunity',
  student_accommodation: 'Student Accommodation',
  consultant_panel: 'Consultant Panel',
  aspiring_developer: 'Aspiring Developer',
  general: 'General Lead',
};

// Get routing info for a given user type and form data
export function getRoutingInfo(userType, formData) {
  const rule = ROUTING_RULES[userType];
  if (!rule) {
    return {
      department: DEPARTMENTS.UNASSIGNED,
      leadType: 'general',
      priority: 'low',
      notification: {
        subject: 'New Application - {{refNumber}}',
        template: 'general-application',
      },
    };
  }
  
  // If department is a function, evaluate it with formData
  let department = rule.department;
  if (typeof department === 'function') {
    department = department(formData);
  }
  
  return {
    department: department || DEPARTMENTS.UNASSIGNED,
    leadType: rule.leadType || 'general',
    priority: rule.priority || 'medium',
    notification: rule.notification || {
      subject: 'New Application - {{refNumber}}',
      template: 'general-application',
    },
  };
}

// Get department email address
export function getDepartmentEmail(department) {
  return DEPARTMENT_EMAILS[department] || DEPARTMENT_EMAILS[DEPARTMENTS.UNASSIGNED];
}

// Get department display name
export function getDepartmentName(department) {
  return DEPARTMENT_NAMES[department] || DEPARTMENT_NAMES[DEPARTMENTS.UNASSIGNED];
}