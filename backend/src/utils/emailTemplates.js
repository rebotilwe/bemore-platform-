/**
 * Email templates for department notifications
 */

export const departmentEmailTemplates = {
  'pormat_sales': {
    subject: 'New Landowner Lead - {{refNumber}} - Pormat Sales',
    template: `
      <h2>New Landowner Lead</h2>
      <p><strong>Reference:</strong> {{refNumber}}</p>
      <p><strong>Applicant:</strong> {{applicantName}}</p>
      <p><strong>Email:</strong> {{applicantEmail}}</p>
      <p><strong>Phone:</strong> {{applicantPhone}}</p>
      <p><strong>Lead Type:</strong> {{leadType}}</p>
      <p><strong>Land Outcome:</strong> {{landOutcome}}</p>
      <p><strong>Action Required:</strong> Review and contact the applicant regarding their land sale opportunity.</p>
      <p><a href="{{platformUrl}}/admin/leads/{{refNumber}}">View Application</a></p>
    `,
  },
  'pormat_management': {
    subject: 'New Student Accommodation Lead - {{refNumber}} - Pormat Management',
    template: `
      <h2>New Student Accommodation Lead</h2>
      <p><strong>Reference:</strong> {{refNumber}}</p>
      <p><strong>Applicant:</strong> {{applicantName}}</p>
      <p><strong>Email:</strong> {{applicantEmail}}</p>
      <p><strong>Phone:</strong> {{applicantPhone}}</p>
      <p><strong>Lead Type:</strong> {{leadType}}</p>
      <p><strong>Portfolio Size:</strong> {{portfolioSize}}</p>
      <p><strong>Action Required:</strong> Review and contact the operator regarding their student accommodation.</p>
      <p><a href="{{platformUrl}}/admin/leads/{{refNumber}}">View Application</a></p>
    `,
  },
  'muma_consulting': {
    subject: 'New {{userType}} Lead - {{refNumber}} - Muma Consulting',
    template: `
      <h2>New {{userType}} Lead</h2>
      <p><strong>Reference:</strong> {{refNumber}}</p>
      <p><strong>Applicant:</strong> {{applicantName}}</p>
      <p><strong>Email:</strong> {{applicantEmail}}</p>
      <p><strong>Phone:</strong> {{applicantPhone}}</p>
      <p><strong>Lead Type:</strong> {{leadType}}</p>
      <p><strong>Priority:</strong> {{priority}}</p>
      <p><strong>Action Required:</strong> Review and contact the applicant for {{leadType}}.</p>
      <p><a href="{{platformUrl}}/admin/leads/{{refNumber}}">View Application</a></p>
    `,
  },
  'unassigned': {
    subject: 'New Application - {{refNumber}} (Unassigned)',
    template: `
      <h2>New Application - Unassigned</h2>
      <p><strong>Reference:</strong> {{refNumber}}</p>
      <p><strong>Applicant:</strong> {{applicantName}}</p>
      <p><strong>Email:</strong> {{applicantEmail}}</p>
      <p><strong>Phone:</strong> {{applicantPhone}}</p>
      <p><strong>User Type:</strong> {{userType}}</p>
      <p><strong>Action Required:</strong> Please assign this lead to the appropriate department.</p>
      <p><a href="{{platformUrl}}/admin/leads/{{refNumber}}">View Application</a></p>
    `,
  },
};