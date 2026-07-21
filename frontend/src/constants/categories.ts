import type { ProfileCategory } from '../types/index.ts';

export interface CategoryMeta {
  slug: ProfileCategory;
  icon: string;
  title: string;
  description: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { slug: 'developer',    icon: '🏗️', title: 'Property Developer',               description: 'Access capital at any stage — concept to construction-ready. We match you with funders aligned to your project type and scale.' },
  { slug: 'landowner',    icon: '🌍', title: 'Land Owner',                        description: 'You hold the asset. We unlock it — funding partnerships, institutional joint ventures, and development matching.' },
  { slug: 'investor',     icon: '💰', title: 'Investor',                          description: 'Deploy capital into vetted student accommodation developments. Access deal flow, co-investment opportunities, and institutional-grade projects.' },
  { slug: 'student',      icon: '🎓', title: 'Student Accommodation Operator',    description: 'Scale your portfolio with institutional backing from PBSA and funding partners. High-occupancy operators get priority access.' },
  { slug: 'professional', icon: '📐', title: 'Built Environment Professionals',    description: 'Architects, engineers, QS and PMs — find equity partnerships and turnkey development opportunities at scale.' },
  { slug: 'aspiring',     icon: '🚀', title: 'Aspiring Developer',                description: 'New to property development? Get mentorship, deal preparation support, and exposure to funding institutions through the Catalyst Programme.' },
];

export const CATEGORY_LABELS: Record<ProfileCategory, string> = {
  developer: 'Developer', landowner: 'Landowner', investor: 'Investor',
  student: 'Operator', professional: 'Professional', aspiring: 'Aspiring',
};