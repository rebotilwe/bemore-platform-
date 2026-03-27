import 'dotenv/config';
import mongoose from 'mongoose';
import { config } from './src/config/index.js';
import Application from './src/models/Application.js';

const FIRST_NAMES = ['Thabo', 'Naledi', 'Sipho', 'Zanele', 'Kagiso', 'Lindiwe', 'Mandla', 'Ayanda', 'Bongani', 'Nomvula', 'Tshepo', 'Khanyi', 'Sizwe', 'Palesa', 'Lebo', 'Dineo', 'Vusi', 'Thandiwe', 'Mpho', 'Nkosazana', 'Jabu', 'Refiloe', 'Sello', 'Thandi', 'Bheki', 'Nosipho', 'Dumisani', 'Zodwa', 'Sfiso', 'Lerato'];
const SURNAMES = ['Molefe', 'Ndlovu', 'Nkosi', 'Dlamini', 'Zulu', 'Mkhize', 'Mokoena', 'Khumalo', 'Sithole', 'Ngcobo', 'Mahlangu', 'Maseko', 'Radebe', 'Mthembu', 'Cele', 'Sibiya', 'Zondi', 'Madonsela', 'Shabalala', 'Buthelezi', 'Vilakazi', 'Tshabalala', 'Phiri', 'Zwane', 'Mogale', 'Ntuli', 'Ngubane', 'Mabaso', 'Khoza', 'Mazibuko'];
const COMPANIES = ['Molefe Developments', 'Ndlovu Property Group', 'Nkosi Capital', 'Zulu Holdings', 'Mkhize Properties', 'KZN Developers', 'Gauteng Land Corp', 'Cape Infrastructure', 'Limpopo Projects', 'Mpumalanga Builders', 'Free State Properties', 'Eastern Cape Housing', 'North West Land', 'Tshwane Developments', ''];
const TYPES = ['developer', 'landowner', 'investor', 'student', 'professional', 'aspiring'];
const STATUSES = ['new', 'new', 'new', 'reviewing', 'reviewing', 'shortlisted', 'shortlisted', 'invited', 'funded'];
const LAND_STATUS = ['Land Secured', 'Land Identified', 'Searching for Land', 'Land Secured', 'Land Identified'];
const PROJECT_STAGE = ['Feasibility Stage', 'Design Stage', 'Funding Stage', 'Construction Stage', 'Funding Stage', 'Design Stage'];
const EST_VALUE = ['Under R5m', 'R5m – R20m', 'R5m – R20m', 'R20m – R100m', 'R20m – R100m', 'R100m+'];
const SEEKING = ['Equity Partner', 'Debt Funding', 'Joint Venture', 'Technical Partner', 'Grant Funding'];
const PREV_FUNDING = ['None', 'Private Funding', 'Private Funding', 'Institutional Funding', 'Government Grant'];
const ATTENDANCE = ['Yes – Both Days', 'Yes – Day 1 Only', 'Yes – Day 2 Only', 'No – Virtual Only'];
const FUNDERS = ['DBSA', 'NHFC', 'NEF', 'SAIF'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, min, max) {
  const n = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}
function randomDate(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(Math.floor(Math.random() * 14) + 7, Math.floor(Math.random() * 60));
  return d;
}
function randomPhone() {
  return `+27${6 + Math.floor(Math.random() * 4)}${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`;
}

function buildFormData(type) {
  const base = {
    landStatus: pick(LAND_STATUS),
    projectStage: pick(PROJECT_STAGE),
    estimatedValue: pick(EST_VALUE),
    seeking: pickN(SEEKING, 1, 3),
    previousFunding: pick(PREV_FUNDING),
    projectDescription: `This is a ${pick(['mixed-use', 'residential', 'student accommodation', 'affordable housing', 'social infrastructure'])} development project in ${pick(['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Polokwane', 'Bloemfontein', 'Nelspruit', 'East London'])}. The project aims to deliver ${50 + Math.floor(Math.random() * 450)} units and create ${20 + Math.floor(Math.random() * 200)} construction jobs. We have secured planning approval and are ready to proceed with the next phase of development.`,
    whyChooseYou: `Our team has ${2 + Math.floor(Math.random() * 15)} years of experience in property development. We have a proven track record of delivering projects on time and within budget. Our commitment to community empowerment and HDI inclusion aligns with the BeMore mandate.`,
    summitAttendance: pick(ATTENDANCE),
    tcAccepted: true,
    popiaConsent: true,
  };

  if (type === 'developer') {
    base.yearsExperience = pick(['1 – 3 years', '3 – 5 years', '5 – 10 years', '10+ years']);
    base.developmentTypes = pickN(['Residential', 'Commercial', 'Mixed-Use', 'Student Housing', 'Affordable Housing'], 1, 3);
  } else if (type === 'landowner') {
    base.landSize = pick(['Under 1,000 sqm', '1,000 – 5,000 sqm', '5,000 – 10,000 sqm', '10,000+ sqm']);
    base.zoningStatus = pick(['Zoned Residential', 'Zoned Mixed-Use', 'Awaiting Rezoning', 'Unzoned']);
    base.isServiced = pick(['Yes – Fully Serviced', 'Partially Serviced', 'No – Unserviced']);
    base.ownershipStructure = pick(['Individual', 'Trust', 'Company', 'Community']);
  } else if (type === 'investor') {
    base.investmentFocus = pickN(['Student Housing', 'Affordable Housing', 'Social Infrastructure', 'Mixed-Use'], 1, 3);
    base.investmentTicket = pick(['Under R5m', 'R5m – R20m', 'R20m – R50m', 'R50m – R100m', 'R100m+']);
  } else if (type === 'student') {
    base.bedCount = pick(['Under 100', '100 – 250', '250 – 500', '500+']);
    base.occupancyRate = pick(['Under 70%', '70% – 85%', '85% – 95%', '95%+']);
    base.universityPartnership = pick(['Yes – Formally Accredited', 'Yes – Informal', 'No']);
    base.assetType = pick(['Purpose-Built', 'Converted Residential', 'Mixed Portfolio']);
  } else if (type === 'professional') {
    base.profession = pick(['Architect', 'Quantity Surveyor', 'Engineer', 'Town Planner', 'Project Manager']);
    base.registrationStatus = pick(['SACAP Registered', 'ECSA Registered', 'SACQSP Registered', 'Pending Registration']);
    base.projectScale = pick(['Under R5m', 'R5m – R20m', 'R20m – R50m', 'R50m+']);
  } else if (type === 'aspiring') {
    base.developmentInterests = pickN(['Residential', 'Student Housing', 'Affordable Housing', 'Commercial'], 1, 3);
    base.relevantExperience = pick(['None', 'Construction worker', 'Property management', 'Real estate agent', 'Community development']);
  }

  return base;
}

function generateApplication() {
  const firstName = pick(FIRST_NAMES);
  const surname = pick(SURNAMES);
  const userType = pick(TYPES);
  const status = pick(STATUSES);
  const submittedAt = randomDate(90);

  const app = {
    userType,
    personal: {
      firstName,
      surname,
      email: `${firstName.toLowerCase()}.${surname.toLowerCase()}@${pick(['gmail.com', 'outlook.com', 'yahoo.co.za', `${surname.toLowerCase()}.co.za`])}`,
      phone: randomPhone(),
      companyName: pick(COMPANIES) || undefined,
    },
    formData: buildFormData(userType),
    status,
    dealRoom: {
      summitAccess: status === 'invited' || status === 'funded' || Math.random() > 0.7,
      dealRoomEntry: status === 'invited' || status === 'funded' ? Math.random() > 0.3 : false,
      funders: ['shortlisted', 'invited', 'funded'].includes(status) ? pickN(FUNDERS, 0, 3) : [],
    },
    adminNotes: Math.random() > 0.6 ? pick([
      'Strong application, good track record.',
      'Needs further review — verify land ownership docs.',
      'Interesting profile, potential for DBSA pipeline.',
      'Follow up on funding history claims.',
      'Priority — institutional grade project.',
      'Schedule follow-up call with applicant.',
      'Referred by existing partner in the programme.',
    ]) : undefined,
    submittedAt,
    updatedAt: status !== 'new' ? new Date(submittedAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : undefined,
  };

  return app;
}

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.mongoUri);
  console.log('Connected.');

  const existing = await Application.countDocuments();
  if (existing > 0) {
    console.log(`Database already has ${existing} applications.`);
    const answer = process.argv.includes('--force');
    if (!answer) {
      console.log('Use --force to clear and re-seed. Exiting.');
      await mongoose.disconnect();
      return;
    }
    console.log('Clearing existing applications...');
    await Application.deleteMany({});
  }

  const COUNT = 65;
  console.log(`Seeding ${COUNT} applications...`);

  const apps = [];
  for (let i = 0; i < COUNT; i++) {
    apps.push(generateApplication());
  }

  // Insert one by one to trigger pre-save hooks (auto-tag + refNumber)
  let created = 0;
  for (const data of apps) {
    const app = new Application(data);
    await app.save();
    created++;
    if (created % 10 === 0) console.log(`  ${created}/${COUNT} created...`);
  }

  console.log(`\nDone! ${created} applications seeded.`);

  // Print summary
  const stats = await Application.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  console.log('\nBy status:');
  stats.forEach(s => console.log(`  ${s._id}: ${s.count}`));

  const byType = await Application.aggregate([
    { $group: { _id: '$userType', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  console.log('\nBy type:');
  byType.forEach(t => console.log(`  ${t._id}: ${t.count}`));

  await mongoose.disconnect();
  console.log('\nDisconnected. Seed complete.');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
