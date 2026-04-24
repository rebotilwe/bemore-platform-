/**
 * Auto-tagging engine — applies intelligence tags based on form data.
 * Mirror of frontend src/utils/auto-tag.ts (keep in sync).
 */
export function autoTag(type, f) {
  if (!f) return [];
  const t = [];

  // ── Value-based tags ──
  if (f.estimatedValue === 'R100m+') { t.push('HIGH_VALUE', 'LARGE_CAPITAL'); }
  else if (f.estimatedValue === 'R20m – R100m') { t.push('HIGH_VALUE'); }
  else if (f.estimatedValue === 'R5m – R20m') { t.push('MID_VALUE'); }

  // ── Land & project status ──
  if (f.landStatus === 'Land Secured') t.push('LAND_SECURED');
  if (f.projectStage === 'Funding Stage') t.push('FUNDING_STAGE');
  if (f.projectStage === 'Construction Stage') t.push('SHOVEL_READY');

  // ── Funding history ──
  if (f.previousFunding?.includes('Institutional')) { t.push('FUNDED_BEFORE', 'INSTITUTIONAL_TRACK'); }
  else if (f.previousFunding?.includes('Private')) { t.push('FUNDED_BEFORE'); }

  // ── Seeking ──
  if (f.seeking?.includes('Equity Partner')) t.push('SEEKS_EQUITY');
  if (f.seeking?.includes('Debt Funding')) t.push('SEEKS_DEBT');

  // ── Composite tags ──
  if (f.landStatus === 'Land Secured' && ['Funding Stage', 'Construction Stage'].includes(f.projectStage)) {
    t.push('PIPELINE_READY');
  }
  if (typeof f.estimatedValue === 'string' && f.landStatus === 'Land Secured' && f.estimatedValue.includes('R100m')) {
    t.push('INSTITUTIONAL_GRADE');
  }

  // ── Profile-specific tags ──
  if (type === 'developer') {
    if (f.yearsExperience === '10+ years') t.push('EXPERIENCED');
    if (f.developmentTypes?.includes('Student Housing')) t.push('STUDENT_FOCUS');
  } else if (type === 'landowner') {
    if (f.landSize?.includes('5,000')) t.push('LARGE_LAND');
    if (f.isServiced?.includes('Yes')) t.push('SERVICED');
    if (f.zoningStatus && !['Unzoned', 'Awaiting Rezoning'].includes(f.zoningStatus)) t.push('ZONED');
  } else if (type === 'investor') {
    t.push('INVESTOR');
    if (f.investmentTicket?.includes('R100m')) t.push('LARGE_INVESTOR');
  } else if (type === 'student') {
    if (f.bedCount?.includes('500+')) t.push('LARGE_OPERATOR');
    if (f.occupancyRate?.includes('95%+')) t.push('HIGH_OCCUPANCY');
    if (f.universityPartnership?.includes('Yes')) t.push('UNI_ACCREDITED');
    if (f.bedCount?.includes('500+') && f.occupancyRate?.includes('95%+')) t.push('INSTITUTIONAL_GRADE');
  } else if (type === 'professional') {
    if (f.projectScale?.includes('R20m')) t.push('LARGE_SCALE');
    if (f.registrationStatus?.includes('SACAP') || f.registrationStatus?.includes('ECSA')) t.push('REGISTERED');
  }

  return [...new Set(t)];
}
