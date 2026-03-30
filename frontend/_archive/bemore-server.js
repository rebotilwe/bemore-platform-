/**
 * BeMore SME Access Initiative
 * Backend API Server — Node.js + Express + MongoDB
 *
 * QUICK START:
 *   1. cp .env.example .env
 *   2. Fill in your MongoDB Atlas URI + credentials
 *   3. npm install
 *   4. npm run dev
 *
 * API BASE: http://localhost:5000/api
 */

require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = process.env.PORT || 5000;

// ════════════════════════════════════════════
//  MIDDLEWARE
// ════════════════════════════════════════════
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET','POST','PATCH','DELETE']
}));

// Rate limiting — apply to all API routes
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});
app.use('/api/', limiter);

// Stricter limiter for form submissions
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many submissions. Please try again in an hour.' }
});

// ════════════════════════════════════════════
//  MONGOOSE SCHEMAS
// ════════════════════════════════════════════

// Application Schema — flexible JSONB-style via Mixed type
const applicationSchema = new mongoose.Schema({
  refNumber:  { type: String, unique: true, default: () => `BM-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000)}` },
  userType:   { type: String, enum: ['developer','landowner','student','professional'], required: true },

  // Personal details (common across all forms)
  personal: {
    firstName:   { type: String, required: true, trim: true },
    surname:     { type: String, required: true, trim: true },
    email:       { type: String, required: true, lowercase: true, trim: true },
    phone:       { type: String, required: true, trim: true },
    companyName: { type: String, trim: true }
  },

  // Type-specific form data stored as flexible document
  formData: { type: mongoose.Schema.Types.Mixed, required: true },

  // Auto-generated intelligence tags
  tags: [{ type: String }],

  // Admin-managed fields
  status:       { type: String, enum: ['new','reviewing','shortlisted','invited','funded'], default: 'new' },
  dealRoom: {
    summitAccess:   { type: Boolean, default: false },
    dealRoomEntry:  { type: Boolean, default: false },
    funders:        [{ type: String, enum: ['DBSA','NHFC','NEF','SAIF'] }],
    notes:          { type: String }
  },
  adminNotes: { type: String },

  // Metadata
  ipAddress:   { type: String },
  submittedAt: { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
}, { timestamps: true });

// Auto-tag on save based on form data
applicationSchema.pre('save', function(next) {
  this.tags = [];

  if (this.userType === 'developer') {
    const f = this.formData;
    if (f.fundingRequirement?.includes('R20m')) this.tags.push('HIGH_VALUE','LARGE_CAPITAL');
    if (f.fundingRequirement?.includes('R5m'))  this.tags.push('MID_VALUE');
    if (f.projectStage === 'Construction Ready') this.tags.push('SHOVEL_READY');
    if (f.previousFunding === 'Yes')             this.tags.push('FUNDED_BEFORE');
  }
  if (this.userType === 'landowner') {
    const f = this.formData;
    if (f.landSize?.includes('5000'))     this.tags.push('LARGE_LAND');
    if (f.isServiced === 'Yes')           this.tags.push('SERVICED');
    if (['Residential','Commercial','Mixed-Use'].includes(f.zoningStatus)) this.tags.push('ZONED');
    if (f.zoningStatus !== 'Unzoned' && f.isServiced === 'Yes') this.tags.push('PIPELINE_READY');
  }
  if (this.userType === 'student') {
    const f = this.formData;
    if (f.bedCount?.includes('500+'))          this.tags.push('LARGE_OPERATOR');
    if (f.occupancyRate?.includes('95%+'))     this.tags.push('HIGH_OCCUPANCY');
    if (f.universityPartnership === 'Yes')     this.tags.push('UNI_ACCREDITED');
    if (f.bedCount?.includes('500+') && f.occupancyRate?.includes('95%+')) this.tags.push('INSTITUTIONAL_GRADE');
  }
  if (this.userType === 'professional') {
    const f = this.formData;
    if (f.projectScale?.includes('R20m'))      this.tags.push('LARGE_SCALE');
    if (f.registrationStatus?.includes('SACAP')||f.registrationStatus?.includes('ECSA')) this.tags.push('REGISTERED');
  }

  next();
});

// Index for fast filtering
applicationSchema.index({ userType: 1, status: 1 });
applicationSchema.index({ tags: 1 });
applicationSchema.index({ 'personal.email': 1 });
applicationSchema.index({ submittedAt: -1 });

const Application = mongoose.model('Application', applicationSchema);

// Admin Session Log
const adminLogSchema = new mongoose.Schema({
  action:        String,
  applicationId: mongoose.Schema.Types.ObjectId,
  adminEmail:    String,
  metadata:      mongoose.Schema.Types.Mixed,
  timestamp:     { type: Date, default: Date.now }
});
const AdminLog = mongoose.model('AdminLog', adminLogSchema);

// ════════════════════════════════════════════
//  AUTH MIDDLEWARE
// ════════════════════════════════════════════
const requireAuth = (req, res, next) => {
  const header = req.headers['authorization'];
  const token  = header && header.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_this');
    req.admin = decoded;
    next();
  } catch {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};

// ════════════════════════════════════════════
//  EMAIL HELPER
// ════════════════════════════════════════════
const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.SMTP_USER) {
    console.log(`[EMAIL SKIPPED] To: ${to} | Subject: ${subject}`);
    return;
  }
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  await transporter.sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to, subject, html });
};

const confirmationEmail = (app) => ({
  to: app.personal.email,
  subject: `Application Received — Ref: ${app.refNumber} | BeMore SME Access Initiative`,
  html: `
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:40px;background:#080810;color:#f4f0e6">
      <h1 style="color:#c9a84c;font-size:32px;margin-bottom:4px">BeMore</h1>
      <p style="color:#7a7a94;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin-bottom:40px">SME Access Initiative</p>
      <h2 style="font-size:24px;margin-bottom:16px">Application Received</h2>
      <p style="color:#a8a8c0;line-height:1.8;margin-bottom:24px">
        Dear ${app.personal.firstName},<br><br>
        Your application has been received and is under review. Our merit-based selection process ensures only the most aligned opportunities proceed to the Deal Room.
      </p>
      <div style="background:#1c1c2e;border:1px solid rgba(201,168,76,.25);border-radius:8px;padding:24px;margin-bottom:32px">
        <p style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7a7a94;margin-bottom:8px">Reference Number</p>
        <p style="font-size:22px;color:#c9a84c;font-family:monospace">${app.refNumber}</p>
      </div>
      <p style="color:#a8a8c0;line-height:1.8;margin-bottom:8px">
        Shortlisted applicants will receive a personal invitation to the BeMore Summit:<br>
        <strong style="color:#f4f0e6">30–31 March 2026 · Sandton</strong>
      </p>
      <p style="color:#7a7a94;font-size:12px;margin-top:40px">BeMore SME Access Initiative · Limited Access · Strictly Merit-Based Selection</p>
    </div>
  `
});

// ════════════════════════════════════════════
//  ROUTES — PUBLIC
// ════════════════════════════════════════════

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── Submit Application ──────────────────────────────────────
const applicationValidation = [
  body('userType').isIn(['developer','landowner','student','professional']),
  body('personal.firstName').notEmpty().trim().isLength({ max: 100 }),
  body('personal.surname').notEmpty().trim().isLength({ max: 100 }),
  body('personal.email').isEmail().normalizeEmail(),
  body('personal.phone').notEmpty().trim().isLength({ min: 7, max: 20 }),
  body('formData').isObject()
];

app.post('/api/applications', submitLimiter, applicationValidation, async (req, res) => {
  // Validate
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    // Check for duplicate email per event (optional — remove if you want multiple submissions)
    const existing = await Application.findOne({ 'personal.email': req.body.personal.email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An application with this email already exists.',
        refNumber: existing.refNumber
      });
    }

    const application = new Application({
      userType:  req.body.userType,
      personal:  req.body.personal,
      formData:  req.body.formData,
      ipAddress: req.ip
    });

    await application.save();

    // Send confirmation email (non-blocking)
    sendEmail(confirmationEmail(application)).catch(console.error);

    // Notify admin
    sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `New Application: ${application.personal.firstName} ${application.personal.surname} (${application.userType})`,
      html: `<p>New ${application.userType} application from ${application.personal.email}. Ref: ${application.refNumber}</p>`
    }).catch(console.error);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        refNumber: application.refNumber,
        userType:  application.userType,
        tags:      application.tags,
        submittedAt: application.submittedAt
      }
    });

  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ════════════════════════════════════════════
//  ROUTES — ADMIN AUTH
// ════════════════════════════════════════════

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required' });
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@bemore.co.za';
  const adminPass  = process.env.ADMIN_PASSWORD || '';

  if (email !== adminEmail) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const match = password === adminPass; // In production: bcrypt.compare
  if (!match) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { email: adminEmail, role: 'admin' },
    process.env.JWT_SECRET || 'dev_secret_change_this',
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.json({ success: true, token, expiresIn: '8h' });
});

app.get('/api/auth/verify', requireAuth, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

// ════════════════════════════════════════════
//  ROUTES — ADMIN APPLICATIONS
// ════════════════════════════════════════════

// Get all applications with filters
app.get('/api/applications', requireAuth, async (req, res) => {
  try {
    const {
      userType, status, tags,
      search, page = 1, limit = 50,
      sortBy = 'submittedAt', order = 'desc'
    } = req.query;

    const filter = {};
    if (userType && userType !== 'all') filter.userType = userType;
    if (status   && status !== 'all')   filter.status = status;
    if (tags)    filter.tags = { $in: tags.split(',') };
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [
        { 'personal.firstName': re },
        { 'personal.surname': re },
        { 'personal.email': re },
        { 'personal.companyName': re },
        { refNumber: re }
      ];
    }

    const total = await Application.countDocuments(filter);
    const apps  = await Application.find(filter)
      .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: apps,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total/limit) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get stats for dashboard
app.get('/api/applications/stats', requireAuth, async (req, res) => {
  try {
    const [total, byType, byStatus, byTag] = await Promise.all([
      Application.countDocuments(),
      Application.aggregate([{ $group: { _id: '$userType', count: { $sum: 1 } } }]),
      Application.aggregate([{ $group: { _id: '$status',   count: { $sum: 1 } } }]),
      Application.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    const recentApps = await Application.find()
      .sort({ submittedAt: -1 })
      .limit(8)
      .select('personal userType status tags refNumber submittedAt')
      .lean();

    res.json({ success: true, data: { total, byType, byStatus, byTag, recentApps } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single application
app.get('/api/applications/:id', requireAuth, async (req, res) => {
  try {
    const app = await Application.findById(req.params.id).lean();
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ success: true, data: app });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update application (status, deal room, notes)
app.patch('/api/applications/:id', requireAuth, async (req, res) => {
  try {
    const allowed = ['status','dealRoom','adminNotes'];
    const update  = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k] });
    update.updatedAt = new Date();

    const updated = await Application.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Not found' });

    // Log admin action
    await AdminLog.create({
      action:        'UPDATE_APPLICATION',
      applicationId: updated._id,
      adminEmail:    req.admin.email,
      metadata:      update
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Export CSV
app.get('/api/applications/export/csv', requireAuth, async (req, res) => {
  try {
    const { userType, status } = req.query;
    const filter = {};
    if (userType && userType !== 'all') filter.userType = userType;
    if (status   && status !== 'all')   filter.status = status;

    const apps = await Application.find(filter).sort({ submittedAt: -1 }).lean();

    const headers = ['Ref','Type','First Name','Surname','Email','Phone','Company','Tags','Status','Submitted'];
    const rows = apps.map(a => [
      a.refNumber,
      a.userType,
      a.personal.firstName,
      a.personal.surname,
      a.personal.email,
      a.personal.phone,
      a.personal.companyName || '',
      (a.tags || []).join(';'),
      a.status,
      new Date(a.submittedAt).toISOString().split('T')[0]
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="bemore-applications-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reports — pre-built segmentation queries
app.get('/api/reports/:reportName', requireAuth, async (req, res) => {
  try {
    const reports = {
      'high-value-developers': {
        filter:      { userType: 'developer', tags: { $in: ['HIGH_VALUE','LARGE_CAPITAL'] } },
        description: 'Developers requiring R5m+ funding'
      },
      'pipeline-ready-land': {
        filter:      { userType: 'landowner', tags: { $all: ['PIPELINE_READY','SERVICED'] } },
        description: 'Serviced, zoned land ready for development'
      },
      'institutional-grade-housing': {
        filter:      { userType: 'student', tags: { $all: ['LARGE_OPERATOR','HIGH_OCCUPANCY'] } },
        description: '500+ beds at 95%+ occupancy — DBSA/NHFC ready'
      },
      'deal-room-shortlist': {
        filter:      { status: { $in: ['shortlisted','invited'] } },
        description: 'All shortlisted and invited applicants'
      }
    };

    const report = reports[req.params.reportName];
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    const data = await Application.find(report.filter)
      .sort({ submittedAt: -1 })
      .lean();

    res.json({ success: true, report: req.params.reportName, description: report.description, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ════════════════════════════════════════════
//  CONNECT + START
// ════════════════════════════════════════════
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bemore')
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════╗
║   BeMore API Server Running               ║
║   http://localhost:${PORT}                    ║
║                                           ║
║   Endpoints:                              ║
║   POST /api/applications  (submit form)   ║
║   POST /api/auth/login    (admin login)   ║
║   GET  /api/applications  (admin list)    ║
║   GET  /api/applications/stats            ║
║   GET  /api/applications/export/csv       ║
║   GET  /api/reports/:name                 ║
╚═══════════════════════════════════════════╝
      `);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
