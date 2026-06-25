import type { Page } from '../../types/index.ts';

type Tab = 'overview' | 'group' | 'vision' | 'empowerment' | 'impact' | 'performance' | 'opportunity';

const TABS: { key: Tab; label: string; path: string }[] = [
  { key: 'overview',    label: 'Overview',        path: '/about/overview' },
  { key: 'group',       label: 'Group Structure', path: '/about/group' },
  { key: 'vision',      label: 'Vision & Mission',path: '/about/vision' },
  { key: 'empowerment', label: 'Empowerment',     path: '/about/empowerment' },
  { key: 'impact',      label: 'Impact',          path: '/about/impact' },
  { key: 'performance', label: 'Performance',     path: '/about/performance' },
  { key: 'opportunity', label: 'Opportunity',     path: '/about/opportunity' },
];

function renderSubNav(active: Tab): string {
  const links = TABS.map(t =>
    `<a class="about-nav-link${t.key === active ? ' active' : ''}" href="#${t.path}">${t.label}</a>`
  ).join('');
  return `
    <div class="about-nav">
      <div class="about-nav-inner">${links}</div>
    </div>`;
}

const renderHero = () => `
  <div class="about-hero">
    <div class="about-hero-bg" aria-hidden="true"></div>
    <div class="about-hero-inner">
      <div class="about-badge fade-in">About BeMore Group</div>
      <h1 class="about-hero-title display fade-up stagger-1">
        Social Infrastructure<br><span class="accent">Equity Partnership</span>
      </h1>
      <p class="about-hero-sub fade-up stagger-2">
        A purpose-built R1.6 billion blended equity and debt vehicle focused on scaling
        student accommodation and social infrastructure across South Africa.
      </p>
    </div>
  </div>`;

const renderCTA = () => `
  <div class="about-cta">
    <div class="about-container">
      <h2 class="about-cta-title display">Ready to Partner?</h2>
      <p class="about-cta-sub">
        Join the BeMore SME Access Initiative and connect with institutional funding partners.
      </p>
      <a class="btn-primary" href="#/gateway" data-track="About — Apply Now">Apply Now →</a>
    </div>
  </div>`;

const SECTION_CONTENT: Record<Tab, string> = {
  overview: `
    <div class="about-section" id="about-overview">
      <div class="about-container">

        <!-- Intro -->
        <div class="about-section-label">01 — Executive Summary</div>
        <h2 class="about-section-title display">Who We Are</h2>
        <p class="about-section-sub">
          BeMore is a purpose-built <strong>R1.6 billion</strong> blended equity and debt vehicle
          scaling student accommodation and social infrastructure across South Africa.
          Explore the sections below to learn more about what drives us.
        </p>

        <!-- Key stats strip -->
        <div class="overview-stats">
          <div class="overview-stat">
            <div class="overview-stat-value display">R1.6B</div>
            <div class="overview-stat-label">Pipeline Value</div>
          </div>
          <div class="overview-stat">
            <div class="overview-stat-value display">R400M</div>
            <div class="overview-stat-label">Equity Sought</div>
          </div>
          <div class="overview-stat">
            <div class="overview-stat-value display">10,000+</div>
            <div class="overview-stat-label">Student Beds Target</div>
          </div>
          <div class="overview-stat">
            <div class="overview-stat-value display">10+</div>
            <div class="overview-stat-label">Years Operating</div>
          </div>
        </div>

        <!-- Section teaser cards -->
        <div class="overview-cards">
          <a class="overview-card" href="#/about/group">
            <div class="overview-card-num">02</div>
            <h3 class="overview-card-title">Group Structure</h3>
            <p class="overview-card-desc">An integrated HoldCo with four subsidiaries delivering end-to-end social infrastructure solutions — from development to architecture and asset management.</p>
            <span class="overview-card-link">Explore →</span>
          </a>
          <a class="overview-card" href="#/about/vision">
            <div class="overview-card-num">03</div>
            <h3 class="overview-card-title">Vision & Mission</h3>
            <p class="overview-card-desc">Inspiring people to be more. Our mission is to create value, proclaim new standards, and build a R100bn diverse portfolio by 2035.</p>
            <span class="overview-card-link">Explore →</span>
          </a>
          <a class="overview-card" href="#/about/empowerment">
            <div class="overview-card-num">04</div>
            <h3 class="overview-card-title">Empowerment</h3>
            <p class="overview-card-desc">A six-step HDI inclusion model that incubates, onboards, and transfers skills to 18+ associates — with a minimum 40% women ownership target.</p>
            <span class="overview-card-link">Explore →</span>
          </a>
          <a class="overview-card" href="#/about/impact">
            <div class="overview-card-num">05</div>
            <h3 class="overview-card-title">Impact</h3>
            <p class="overview-card-desc">9 completed projects, 2,184 student beds delivered, and R0.77B in business value created between 2013 and 2023.</p>
            <span class="overview-card-link">Explore →</span>
          </a>
          <a class="overview-card" href="#/about/performance">
            <div class="overview-card-num">06</div>
            <h3 class="overview-card-title">Performance</h3>
            <p class="overview-card-desc">1,472 NSFAS-accredited beds, 95%+ occupancy, R0.5B market value, and a balanced 50% gearing ratio across the current portfolio.</p>
            <span class="overview-card-link">Explore →</span>
          </a>
          <a class="overview-card" href="#/about/opportunity">
            <div class="overview-card-num">07</div>
            <h3 class="overview-card-title">Opportunity</h3>
            <p class="overview-card-desc">500,000+ bed shortfall nationwide. A validated model ready to scale. BeMore is deploying R1.6B across income-generating, shovel-ready assets.</p>
            <span class="overview-card-link">Explore →</span>
          </a>
        </div>

      </div>
    </div>`,

  group: `
    <div class="about-section about-section-dark" id="about-group">
      <div class="about-container">
        <div class="about-section-label">02 — Group Structure</div>
        <h2 class="about-section-title display">BeMore Group (HoldCo)</h2>
        <p class="about-section-sub">
          An integrated ecosystem of subsidiaries delivering end-to-end social infrastructure solutions.
        </p>
        <div class="about-group-grid">
          <div class="about-group-card" style="--card-accent: #c9a84c">
            <div class="about-group-num">01</div>
            <h3 class="about-group-name">BeMore Properties</h3>
            <p class="about-group-desc">
              Focuses on innovative property development projects across student accommodation
              and affordable housing sectors.
            </p>
          </div>
          <div class="about-group-card" style="--card-accent: #4cb87a">
            <div class="about-group-num">02</div>
            <h3 class="about-group-name">Pormat Property Group</h3>
            <p class="about-group-desc">
              Manages properties and assets with PPNG transactions, ensuring operational
              excellence across the portfolio.
            </p>
          </div>
          <div class="about-group-card" style="--card-accent: #7ab8e8">
            <div class="about-group-num">03</div>
            <h3 class="about-group-name">Muma Consulting</h3>
            <p class="about-group-desc">
              Provides professional consulting and planning services, delivering solutions
              that balance function, sustainability, and community impact.
            </p>
          </div>
          <div class="about-group-card" style="--card-accent: #e8a47a">
            <div class="about-group-num">04</div>
            <h3 class="about-group-name">BeMore Social Infrastructure Equity</h3>
            <p class="about-group-desc">
              The institutional platform for social infrastructure investments, offering
              blended finance vehicles to catalyse impact at scale.
            </p>
          </div>
        </div>
      </div>
    </div>`,

  vision: `
    <div class="about-section" id="about-vision">
      <div class="about-container">
        <div class="about-section-label">03 — Envisioning 2035</div>
        <h2 class="about-section-title display">Vision & Mission</h2>
        <div class="about-vision-grid">
          <div class="about-vision-card about-vision-primary">
            <div class="about-vision-icon">&#9733;</div>
            <h3>Vision</h3>
            <p class="about-vision-quote">"Inspiring people to be more!!"</p>
          </div>
          <div class="about-vision-card">
            <div class="about-vision-icon">&#9654;</div>
            <h3>Mission</h3>
            <ul>
              <li>By creating value</li>
              <li>Proclaiming new standards</li>
              <li>Innovative, Competitive, and Attractive Public Company</li>
            </ul>
          </div>
          <div class="about-vision-card">
            <div class="about-vision-icon">&#9678;</div>
            <h3>Objective</h3>
            <p>
              Create an enabling platform where people can express themselves and enterprise
              portfolios in line with the BeMore ethos, with a <strong>R100bn diverse portfolio by 2035</strong>.
            </p>
          </div>
          <div class="about-vision-card">
            <div class="about-vision-icon">&#9830;</div>
            <h3>Values</h3>
            <div class="about-values-grid">
              <span class="about-value-tag">Integrity</span>
              <span class="about-value-tag">Innovation</span>
              <span class="about-value-tag">Collaboration</span>
              <span class="about-value-tag">Excellence</span>
              <span class="about-value-tag">Sustainability</span>
              <span class="about-value-tag">Empowerment</span>
            </div>
          </div>
        </div>
      </div>
    </div>`,

  empowerment: `
    <div class="about-section about-section-dark" id="about-empowerment">
      <div class="about-container">
        <div class="about-section-label">04 — HDI Inclusion Model</div>
        <h2 class="about-section-title display">Empowerment Strategy</h2>
        <p class="about-section-sub">
          Through our associate model and incubation platform, the partnership builds a pipeline
          of empowered, capable HDI participants across the property development value chain.
        </p>
        <div class="about-ladder">
          <div class="about-ladder-step">
            <div class="about-ladder-num">1</div>
            <div class="about-ladder-content">
              <h4>Incubate HDIs</h4>
              <p>Begin skill incubation and empowering 3 HDI individuals from inception.</p>
            </div>
          </div>
          <div class="about-ladder-step">
            <div class="about-ladder-num">2</div>
            <div class="about-ladder-content">
              <h4>Onboard</h4>
              <p>Add 3 new HDI associates per year over 5 years, totalling 18 HDIs.</p>
            </div>
          </div>
          <div class="about-ladder-step">
            <div class="about-ladder-num">3</div>
            <div class="about-ladder-content">
              <h4>Provide Support</h4>
              <p>Offer technical support, project mentorship, and shared capacity to scale.</p>
            </div>
          </div>
          <div class="about-ladder-step">
            <div class="about-ladder-num">4</div>
            <div class="about-ladder-content">
              <h4>Transfer Skills</h4>
              <p>Transfer skills in property development, project management, and financial capability through mentorship.</p>
            </div>
          </div>
          <div class="about-ladder-step">
            <div class="about-ladder-num">5</div>
            <div class="about-ladder-content">
              <h4>Equity Participation</h4>
              <p>Offer equity-linked participation, shared co-investment, and shared returns.</p>
            </div>
          </div>
          <div class="about-ladder-step">
            <div class="about-ladder-num">6</div>
            <div class="about-ladder-content">
              <h4>Women & Land Ownership</h4>
              <p>Empower a minimum 40% ownership by community women, entrenching long-term wealth creation.</p>
            </div>
          </div>
        </div>
      </div>
    </div>`,

  impact: `
    <div class="about-section" id="about-impact">
      <div class="about-container">
        <div class="about-section-label">05 — Track Record</div>
        <h2 class="about-section-title display">Impact to Date</h2>
        <p class="about-section-sub">Completed projects and mentee impact metrics (2013 — 2023).</p>
        <div class="about-impact-grid">
          <div class="about-impact-card">
            <div class="about-impact-value display">9</div>
            <div class="about-impact-label">Projects Completed</div>
            <div class="about-impact-sub">Finished between 2013 and 2023</div>
          </div>
          <div class="about-impact-card">
            <div class="about-impact-value display">1</div>
            <div class="about-impact-label">In Construction</div>
            <div class="about-impact-sub">Scheduled for completion in 2024</div>
          </div>
          <div class="about-impact-card about-impact-featured">
            <div class="about-impact-value display">2,184</div>
            <div class="about-impact-label">Student Beds</div>
            <div class="about-impact-sub">Total beds delivered to date</div>
          </div>
          <div class="about-impact-card">
            <div class="about-impact-value display">7</div>
            <div class="about-impact-label">Women-Led Projects</div>
            <div class="about-impact-sub">Out of 18 total projects</div>
          </div>
          <div class="about-impact-card">
            <div class="about-impact-value display">R0.77B</div>
            <div class="about-impact-label">Business Value</div>
            <div class="about-impact-sub">Financial value of projects in billions</div>
          </div>
        </div>
      </div>
    </div>`,

  performance: `
    <div class="about-section about-section-dark" id="about-metrics">
      <div class="about-container">
        <div class="about-section-label">06 — Current Portfolio</div>
        <h2 class="about-section-title display">Performance Metrics</h2>
        <div class="about-metrics-grid">
          <div class="about-metric">
            <div class="about-metric-ring" style="--ring-color: #c9a84c">
              <span class="about-metric-value display">1,472</span>
            </div>
            <div class="about-metric-title">Accredited Beds</div>
            <div class="about-metric-desc">NSFAS accredited beds available for students</div>
          </div>
          <div class="about-metric">
            <div class="about-metric-ring" style="--ring-color: #e8a47a">
              <span class="about-metric-value display">R0.5B</span>
            </div>
            <div class="about-metric-title">Market Value</div>
            <div class="about-metric-desc">Approximate market value in current currency units</div>
          </div>
          <div class="about-metric">
            <div class="about-metric-ring" style="--ring-color: #4cb87a">
              <span class="about-metric-value display">95%+</span>
            </div>
            <div class="about-metric-title">Occupancy Rate</div>
            <div class="about-metric-desc">Average occupancy indicating high demand</div>
          </div>
          <div class="about-metric">
            <div class="about-metric-ring" style="--ring-color: #7ab8e8">
              <span class="about-metric-value display">50%</span>
            </div>
            <div class="about-metric-title">Gearing</div>
            <div class="about-metric-desc">Balanced and sustainable financial structure</div>
          </div>
        </div>
      </div>
    </div>`,

  opportunity: `
    <div class="about-section" id="about-opportunity">
      <div class="about-container">
        <div class="about-section-label">07 — Strategic Rationale</div>
        <h2 class="about-section-title display">The Opportunity</h2>
        <div class="about-two-col">
          <div class="about-prose">
            <p>South Africa's social infrastructure faces three concurrent imperatives:</p>
            <div class="about-imperatives">
              <div class="about-imperative">
                <div class="about-imperative-num">1</div>
                <p>A massive shortfall in student accommodation (estimated <strong>500,000+ beds</strong>).</p>
              </div>
              <div class="about-imperative">
                <div class="about-imperative-num">2</div>
                <p>A backlog in decentralised health infrastructure.</p>
              </div>
              <div class="about-imperative">
                <div class="about-imperative-num">3</div>
                <p>A critical need to empower <strong>black-owned, HDI-led</strong> platforms to lead infrastructure delivery.</p>
              </div>
            </div>
          </div>
          <div class="about-response">
            <h3>BeMore seeks to respond by:</h3>
            <ul>
              <li>
                Scaling a validated development model which has delivered to date
                <strong>1,500+ accredited student beds</strong> through mentorship and empowerment
                of at least HDI, in addition to our own 1,472 accredited student beds.
              </li>
              <li>
                Deploying capital across a <strong>R1.6 billion pipeline</strong> of income-generating
                and shovel-ready assets.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>`,
};

function makePage(tab: Tab): Page {
  return {
    render() {
      return `
      <section class="about">
        ${renderHero()}
        ${renderSubNav(tab)}
        ${SECTION_CONTENT[tab]}
        ${renderCTA()}
      </section>`;
    },
    mount() {
      window.scrollTo({ top: 0, behavior: 'instant' });
    },
  };
}

export const aboutPage            = makePage('overview');
export const aboutOverviewPage    = makePage('overview');
export const aboutGroupPage       = makePage('group');
export const aboutVisionPage      = makePage('vision');
export const aboutEmpowermentPage = makePage('empowerment');
export const aboutImpactPage      = makePage('impact');
export const aboutPerformancePage = makePage('performance');
export const aboutOpportunityPage = makePage('opportunity');