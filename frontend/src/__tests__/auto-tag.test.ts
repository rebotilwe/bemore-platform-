import { describe, it, expect } from 'vitest';
import { autoTag } from '../utils/auto-tag';

describe('Auto Tag Utility', () => {
  describe('Universal tags', () => {
    it('should tag HIGH_VALUE for R100m+ projects', () => {
      const tags = autoTag('developer', { estimatedValue: 'R100m+' });
      expect(tags).toContain('HIGH_VALUE');
      expect(tags).toContain('LARGE_CAPITAL');
    });

    it('should tag HIGH_VALUE for R20m-R100m projects', () => {
      const tags = autoTag('developer', { estimatedValue: 'R20m – R100m' });
      expect(tags).toContain('HIGH_VALUE');
    });

    it('should tag MID_VALUE for R5m-R20m projects', () => {
      const tags = autoTag('developer', { estimatedValue: 'R5m – R20m' });
      expect(tags).toContain('MID_VALUE');
    });

    it('should tag LAND_SECURED for secured land', () => {
      const tags = autoTag('landowner', { landStatus: 'Land Secured' });
      expect(tags).toContain('LAND_SECURED');
    });

    it('should tag SHOVEL_READY for construction stage', () => {
      const tags = autoTag('developer', { projectStage: 'Construction Stage' });
      expect(tags).toContain('SHOVEL_READY');
    });

    it('should tag FUNDING_STAGE for funding stage projects', () => {
      const tags = autoTag('developer', { projectStage: 'Funding Stage' });
      expect(tags).toContain('FUNDING_STAGE');
    });

    it('should tag PIPELINE_READY for secured land in funding/construction stage', () => {
      const tags = autoTag('landowner', {
        landStatus: 'Land Secured',
        projectStage: 'Funding Stage',
      });
      expect(tags).toContain('PIPELINE_READY');
    });

    it('should tag INSTITUTIONAL_GRADE for R100m+ secured land', () => {
      const tags = autoTag('landowner', {
        landStatus: 'Land Secured',
        estimatedValue: 'R100m+',
      });
      expect(tags).toContain('INSTITUTIONAL_GRADE');
    });

    it('should tag FUNDED_BEFORE for projects with previous funding', () => {
      const tags = autoTag('developer', { previousFunding: 'Private Equity' });
      expect(tags).toContain('FUNDED_BEFORE');
    });

    it('should tag INSTITUTIONAL_TRACK for institutional funding history', () => {
      const tags = autoTag('developer', { previousFunding: 'Institutional Funder' });
      expect(tags).toContain('INSTITUTIONAL_TRACK');
    });

    it('should tag SEEKS_EQUITY for equity seeking projects', () => {
      const tags = autoTag('developer', { seeking: ['Equity Partner'] });
      expect(tags).toContain('SEEKS_EQUITY');
    });

    it('should tag SEEKS_DEBT for debt seeking projects', () => {
      const tags = autoTag('developer', { seeking: ['Debt Funding'] });
      expect(tags).toContain('SEEKS_DEBT');
    });
  });

  describe('Developer tags', () => {
    it('should tag EXPERIENCED for 10+ years experience', () => {
      const tags = autoTag('developer', { yearsExperience: '10+ years' });
      expect(tags).toContain('EXPERIENCED');
    });

    it('should tag STUDENT_FOCUS for student housing developers', () => {
      const tags = autoTag('developer', { developmentTypes: ['Student Housing'] });
      expect(tags).toContain('STUDENT_FOCUS');
    });
  });

  describe('Landowner tags', () => {
    it('should tag LARGE_LAND for 5,000+ sqm land', () => {
      const tags = autoTag('landowner', { landSize: '5,000 sqm+' });
      expect(tags).toContain('LARGE_LAND');
    });

    it('should tag SERVICED for serviced land', () => {
      const tags = autoTag('landowner', { isServiced: 'Yes' });
      expect(tags).toContain('SERVICED');
    });

    it('should tag ZONED for properly zoned land', () => {
      const tags = autoTag('landowner', { zoningStatus: 'Commercial' });
      expect(tags).toContain('ZONED');
    });

    it('should not tag ZONED for unzoned land', () => {
      const tags = autoTag('landowner', { zoningStatus: 'Unzoned' });
      expect(tags).not.toContain('ZONED');
    });

    it('should tag SEEKS_EQUITY for Joint Venture appetite', () => {
      const tags = autoTag('landowner', { developmentAppetite: 'Partner with a developer (Joint Venture)' });
      expect(tags).toContain('SEEKS_EQUITY');
    });

    it('should tag PIPELINE_READY for landowners with no existing bond', () => {
      const tags = autoTag('landowner', { existingBond: 'No' });
      expect(tags).toContain('PIPELINE_READY');
    });
  });

  describe('Investor tags', () => {
    it('should always tag INVESTOR', () => {
      const tags = autoTag('investor', {});
      expect(tags).toContain('INVESTOR');
    });

    it('should tag LARGE_INVESTOR for R100m+ investment amount', () => {
      const tags = autoTag('investor', { investmentAmount: 'R100m+' });
      expect(tags).toContain('LARGE_INVESTOR');
    });

    it('should tag HIGH_VALUE for R20m+ investment amount', () => {
      const tags = autoTag('investor', { investmentAmount: 'R20m – R100m' });
      expect(tags).toContain('HIGH_VALUE');
    });

    it('should tag EXPERIENCED for investors with prior experience', () => {
      const tags = autoTag('investor', { priorInvestmentExperience: 'Yes' });
      expect(tags).toContain('EXPERIENCED');
    });

    it('should tag STUDENT_FOCUS for student accommodation investors', () => {
      const tags = autoTag('investor', { investmentFocus: ['Student Accommodation'] });
      expect(tags).toContain('STUDENT_FOCUS');
    });

    it('should tag PIPELINE_READY for immediate decision timeline', () => {
      const tags = autoTag('investor', { decisionTimeline: 'Immediate — ready to deploy capital now' });
      expect(tags).toContain('PIPELINE_READY');
    });
  });

  describe('Student accommodation operator tags', () => {
    it('should tag LARGE_OPERATOR for 500+ beds', () => {
      const tags = autoTag('student', { totalBedCount: '500+ beds' });
      expect(tags).toContain('LARGE_OPERATOR');
    });

    it('should tag HIGH_OCCUPANCY for 95%+ occupancy', () => {
      const tags = autoTag('student', { averageOccupancy: '95%+' });
      expect(tags).toContain('HIGH_OCCUPANCY');
    });

    it('should tag UNI_ACCREDITED for university partnerships', () => {
      const tags = autoTag('student', { universityPartnership: 'Yes' });
      expect(tags).toContain('UNI_ACCREDITED');
    });

    it('should tag NSFAS_ACCREDITED for fully accredited operators', () => {
      const tags = autoTag('student', { nsfasAccreditation: 'Fully accredited' });
      expect(tags).toContain('NSFAS_ACCREDITED');
    });

    it('should tag FUNDING_STAGE for operators seeking capital raise', () => {
      const tags = autoTag('student', { supportNeeds: ['Capital raise / funding for expansion'] });
      expect(tags).toContain('FUNDING_STAGE');
    });

    it('should tag INSTITUTIONAL_GRADE for large high-occupancy operators', () => {
      const tags = autoTag('student', {
        totalBedCount: '500+ beds',
        averageOccupancy: '95%+',
      });
      expect(tags).toContain('INSTITUTIONAL_GRADE');
    });

    it('should tag PIPELINE_READY for operators with significant growth intention', () => {
      const tags = autoTag('student', { growthIntention: 'Grow significantly — add 200+ beds' });
      expect(tags).toContain('PIPELINE_READY');
    });
  });

  describe('Professional tags', () => {
    it('should tag LARGE_SCALE for R20m+ typical project value', () => {
      const tags = autoTag('professional', { typicalProjectValue: 'R20m – R100m' });
      expect(tags).toContain('LARGE_SCALE');
    });

    it('should tag REGISTERED for SACAP registered professionals', () => {
      const tags = autoTag('professional', { registrationBody: 'SACAP (Architects)' });
      expect(tags).toContain('REGISTERED');
    });

    it('should tag REGISTERED for ECSA registered professionals', () => {
      const tags = autoTag('professional', { registrationBody: 'ECSA (Engineers)' });
      expect(tags).toContain('REGISTERED');
    });

    it('should tag REGISTERED for ASAQS registered professionals', () => {
      const tags = autoTag('professional', { registrationBody: 'ASAQS (Quantity Surveyors)' });
      expect(tags).toContain('REGISTERED');
    });

    it('should tag PIPELINE_READY for professionals immediately available', () => {
      const tags = autoTag('professional', { currentCapacity: 'Immediately available' });
      expect(tags).toContain('PIPELINE_READY');
    });

    it('should tag SEEKS_EQUITY for professionals actively seeking opportunities', () => {
      const tags = autoTag('professional', { associateDatabase: 'Yes — actively looking for project opportunities' });
      expect(tags).toContain('SEEKS_EQUITY');
    });
  });

  it('should deduplicate tags', () => {
    const tags = autoTag('developer', {
      estimatedValue: 'R100m+',
      projectStage: 'Funding Stage',
    });
    const uniqueTags = [...new Set(tags)];
    expect(tags.length).toBe(uniqueTags.length);
  });
});
