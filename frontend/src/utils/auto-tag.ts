import type { ProfileCategory } from '../types/index.ts';

export function autoTag(type: ProfileCategory, f: Record<string, unknown>): string[] {
  const t: string[] = [];

  // Universal
  if (f.estimatedValue === 'R100m+') t.push('HIGH_VALUE', 'LARGE_CAPITAL');
  if (f.estimatedValue === 'R20m – R100m') t.push('HIGH_VALUE');
  if (f.estimatedValue === 'R5m – R20m') t.push('MID_VALUE');
  if (f.landStatus === 'Land Secured') t.push('LAND_SECURED');
  if (f.projectStage === 'Funding Stage') t.push('FUNDING_STAGE');
  if (f.projectStage === 'Construction Stage') t.push('SHOVEL_READY');
  if (typeof f.previousFunding === 'string') {
    if (f.previousFunding.includes('Institutional')) t.push('FUNDED_BEFORE', 'INSTITUTIONAL_TRACK');
    if (f.previousFunding.includes('Private')) t.push('FUNDED_BEFORE');
  }
  if (Array.isArray(f.seeking)) {
    if (f.seeking.includes('Equity Partner')) t.push('SEEKS_EQUITY');
    if (f.seeking.includes('Debt Funding')) t.push('SEEKS_DEBT');
  }
  if (f.landStatus === 'Land Secured' && ['Funding Stage', 'Construction Stage'].includes(f.projectStage as string)) t.push('PIPELINE_READY');
  if (f.landStatus === 'Land Secured' && (f.estimatedValue as string)?.includes('R100m')) t.push('INSTITUTIONAL_GRADE');

  // Type-specific
  if (type === 'developer') {
    if (f.yearsExperience === '10+ years') t.push('EXPERIENCED');
    if (Array.isArray(f.developmentTypes) && f.developmentTypes.includes('Student Housing')) t.push('STUDENT_FOCUS');
  }
  if (type === 'landowner') {
    if ((f.landSize as string)?.includes('5,000')) t.push('LARGE_LAND');
    if ((f.isServiced as string)?.includes('Yes')) t.push('SERVICED');
    if (f.zoningStatus && !['Unzoned', 'Awaiting Rezoning'].includes(f.zoningStatus as string)) t.push('ZONED');
  }
  if (type === 'investor') {
    t.push('INVESTOR');
    if ((f.investmentTicket as string)?.includes('R100m')) t.push('LARGE_INVESTOR');
  }
  if (type === 'student') {
    if ((f.bedCount as string)?.includes('500+')) t.push('LARGE_OPERATOR');
    if ((f.occupancyRate as string)?.includes('95%+')) t.push('HIGH_OCCUPANCY');
    if ((f.universityPartnership as string)?.includes('Yes')) t.push('UNI_ACCREDITED');
    if ((f.bedCount as string)?.includes('500+') && (f.occupancyRate as string)?.includes('95%+')) t.push('INSTITUTIONAL_GRADE');
  }
  if (type === 'professional') {
    if ((f.projectScale as string)?.includes('R20m')) t.push('LARGE_SCALE');
    if ((f.registrationStatus as string)?.includes('SACAP') || (f.registrationStatus as string)?.includes('ECSA')) t.push('REGISTERED');
  }

  return [...new Set(t)];
}
