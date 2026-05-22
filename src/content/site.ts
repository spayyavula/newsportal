export type Topic = {
  slug: string;
  name: string;
  kicker: string;
  description: string;
  landingIntro: string;
  editorialFocus: string;
  keyQuestions: string[];
  coverageFocus: string[];
  cadence: string;
};

export type StoryType = "reporting" | "analysis" | "opinion";

export type ArticleFormat = "data-led" | "light";

export type ChartType = "line" | "bar" | "area" | "dot" | "stackedBar";

export type ChartSeriesPoint = { x: number | string; y: number };
export type ChartSeries = { name: string; data: ChartSeriesPoint[] };

export type ChartExhibit = {
  figureNumber: number;
  title: string;
  chartType: ChartType;
  series: ChartSeries[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  sourceNote: string;
};

export type SourceNote = { text: string; url?: string };

export type PodcastRecommendation = {
  showName: string;
  episodeTitle: string;
  host?: string;
  durationMinutes: number;
  summary: string;
  listenUrl: string;
  topicSlug: string;
  publishedOn: string;
};

export type BriefItem = {
  title: string;
  summary: string;
  articleSlug?: string;
};

export type DailyBrief = {
  publishedOn: string;
  headline: string;
  developments: BriefItem[];
  factCheck: BriefItem;
  explainer: BriefItem;
  recommendedListen?: PodcastRecommendation;
};

export type ArticleSectionBlock = {
  type: "section";
  heading: string;
  body: string;
};

export type ArticlePullQuoteBlock = {
  type: "pull-quote";
  quote: string;
  attribution: string;
  role?: string;
};

export type ArticleExplainerBlock = {
  type: "explainer";
  title: string;
  body: string;
  keyPoints: string[];
};

export type ArticleExhibitReferenceBlock = {
  type: "exhibit-reference";
  exhibit: ChartExhibit;
};

export type ArticleBlock =
  | ArticleSectionBlock
  | ArticlePullQuoteBlock
  | ArticleExplainerBlock
  | ArticleExhibitReferenceBlock;

export type Author = {
  name: string;
  slug: string;
  role: string;
  bio: string;
  credentials: string;
  coverageAreas: string[];
  editorialPrinciples: string[];
  contactNote: string;
};

export type Article = {
  title: string;
  slug: string;
  summary: string;
  readTime: string;
  storyType: StoryType;
  body: string;
  contentBlocks: ArticleBlock[];
  sources: string[];
  featured: boolean;
  deepDive: boolean;
  format: ArticleFormat;
  sourceType: "staff" | "community";
  contributorByline?: string;
  executiveSummary?: string[];
  leadExhibit?: ChartExhibit;
  sourceNotes?: SourceNote[];
  publishedOn: string;
  author: Author;
  topic: Topic;
};

export const navigation = [
  { href: "/assistant", label: "Assistant" },
  { href: "/articles", label: "Articles" },
  { href: "/authors", label: "Authors" },
  { href: "/topics", label: "Topics" },
  { href: "/about", label: "About" },
  { href: "/standards", label: "Standards" },
  { href: "/corrections", label: "Corrections" },
  { href: "/support", label: "Support" },
];

export const trustSignals = [
  { label: "Advertisements", value: "None" },
  { label: "Primary source links", value: "On every major story" },
  { label: "Corrections window", value: "Same-day update log" },
];

export const editorialPrinciples = [
  {
    kicker: "Editorial charter",
    title: "Headlines inform before they persuade.",
    description:
      "Reporting is framed to convey substance and proportion. Fear-based language, false urgency, and rhetorical headlines written to provoke clicks are not used.",
  },
  {
    kicker: "Transparent sourcing",
    title: "Every claim is traceable to its origin.",
    description:
      "Stories link directly to public records, primary documents, and named interviews so readers can verify the underlying evidence rather than rely on summary.",
  },
  {
    kicker: "Public-interest ranking",
    title: "The homepage is edited for civic value.",
    description:
      "Placement reflects consequence, relevance, and explanatory depth. Stories are not promoted on the basis of engagement metrics or traffic performance.",
  },
];

export const fallbackDailyBrief: DailyBrief = {
  publishedOn: "2026-04-11T08:00:00.000Z",
  headline: "Where public decisions are landing this week.",
  developments: [
    {
      title: "City budget reshapes off-peak transit",
      summary:
        "Council approved the budget last night. The largest service adjustments land outside commuter rush hours, which hits riders with irregular shifts first.",
      articleSlug: "city-budget-transit-schools-renters",
    },
    {
      title: "Utility files new resilience capital plan",
      summary:
        "The plan locks in transformer replacement and outage-duration targets through 2028. Heat-vulnerability funding remains flat.",
      articleSlug: "grid-upgrades-and-heat-risk",
    },
    {
      title: "Regional wage data shows rent-cost divergence",
      summary:
        "Headline wage growth held steady, but renter households in the bottom decile lost ground against essential costs.",
      articleSlug: "paycheck-inflation-gap-households",
    },
  ],
  factCheck: {
    title: "Mayor's claim that 'no service is being cut' — partially supported",
    summary:
      "The budget preserves total service hours but cuts off-peak frequency by roughly 18 percent on three lines, according to the transit planner's own delivery report.",
    articleSlug: "city-budget-transit-schools-renters",
  },
  explainer: {
    title: "What to actually check in a city budget story",
    summary:
      "An evergreen guide to reading line items: where staffing cuts hide, how 'maintained' service can still degrade, and which implementation dates matter.",
    articleSlug: "city-budget-transit-schools-renters",
  },
  recommendedListen: {
    showName: "Council Adjourns",
    episodeTitle: "How off-peak transit service gets quietly trimmed",
    host: "Maya Ortiz",
    durationMinutes: 34,
    summary:
      "A budget reporter walks through how 'maintained' service hours can still degrade frequency on lines with irregular ridership.",
    listenUrl: "https://example.org/podcasts/council-adjourns/off-peak-transit",
    topicSlug: "civic-life",
    publishedOn: "2026-04-12T09:00:00.000Z",
  },
};

export const fallbackPodcastRecommendations: PodcastRecommendation[] = [
  {
    showName: "Council Adjourns",
    episodeTitle: "How off-peak transit service gets quietly trimmed",
    host: "Maya Ortiz",
    durationMinutes: 34,
    summary:
      "A budget reporter walks through how 'maintained' service hours can still degrade frequency on lines with irregular ridership. Pairs with the city budget reporting on Common Ground.",
    listenUrl: "https://example.org/podcasts/council-adjourns/off-peak-transit",
    topicSlug: "civic-life",
    publishedOn: "2026-04-12T09:00:00.000Z",
  },
  {
    showName: "Grid Practical",
    episodeTitle: "Transformer replacement timelines, explained",
    host: "Ravi Annapurna",
    durationMinutes: 27,
    summary:
      "Three engineers describe what a real capital plan looks like inside a utility — and how to read one as an outside observer.",
    listenUrl: "https://example.org/podcasts/grid-practical/transformers",
    topicSlug: "climate-science",
    publishedOn: "2026-04-09T12:00:00.000Z",
  },
  {
    showName: "Slow Listening",
    episodeTitle: "Three quiet piano works for an unhurried afternoon",
    durationMinutes: 41,
    summary:
      "A short, melodic set with notes on each piece — no host commentary between tracks, just the music.",
    listenUrl: "https://example.org/podcasts/slow-listening/three-quiet-piano-works",
    topicSlug: "music-arts",
    publishedOn: "2026-04-11T07:00:00.000Z",
  },
];

export const topicCards: Topic[] = [
  {
    slug: "civic-life",
    name: "Civic Life",
    kicker: "Local institutions",
    description:
      "Council, public agencies, housing, transport, and local governance translated into plain language.",
    landingIntro:
      "This desk focuses on the practical decisions of public institutions and the people affected by them.",
    editorialFocus:
      "Coverage prioritizes budgets, procurement, and service outcomes over performative political conflict.",
    keyQuestions: [
      "Which public services are changing materially?",
      "Who absorbs the cost of delayed or reduced delivery?",
      "What records verify the officials' claims?",
    ],
    coverageFocus: [
      "Budgets and procurement",
      "Service delivery changes",
      "Neighborhood impact",
    ],
    cadence: "Daily brief plus weekly deep dive",
  },
  {
    slug: "climate-science",
    name: "Climate and Science",
    kicker: "Evidence first",
    description:
      "Research, policy, and practical effects explained without overstating uncertainty or drama.",
    landingIntro:
      "The climate and science desk connects new evidence to infrastructure, health, and policy consequences readers can act on.",
    editorialFocus:
      "We avoid crisis theater and focus on what the evidence says, what remains uncertain, and what decisions follow from both.",
    keyQuestions: [
      "What does the latest evidence actually support?",
      "Which systems are reducing or increasing risk?",
      "Where are officials overstating certainty or progress?",
    ],
    coverageFocus: [
      "Policy implementation",
      "Research synthesis",
      "Adaptation and resilience",
    ],
    cadence: "Three explainers per week",
  },
  {
    slug: "work-economy",
    name: "Work and Economy",
    kicker: "Material conditions",
    description:
      "Labor, wages, public spending, and cost-of-living reporting grounded in what people experience.",
    landingIntro:
      "Economic reporting here starts from lived conditions rather than abstract market sentiment.",
    editorialFocus:
      "The desk follows wages, bargaining power, household costs, and the policy choices shaping them.",
    keyQuestions: [
      "Which households are still losing ground?",
      "What do averages conceal about regional reality?",
      "Which institutions have leverage to improve conditions?",
    ],
    coverageFocus: [
      "Labor negotiations",
      "Inflation and household effects",
      "Regional jobs data",
    ],
    cadence: "Twice-weekly reporting with monthly primers",
  },
  {
    slug: "education",
    name: "Education",
    kicker: "Schools and systems",
    description:
      "School funding, learning outcomes, and policy changes covered with teachers, students, and families in view.",
    landingIntro:
      "The education desk tracks how governance choices shape classrooms, staffing, and student support systems.",
    editorialFocus:
      "Rather than moralizing school outcomes, coverage asks which structures help students and which reporting habits obscure them.",
    keyQuestions: [
      "What is happening inside schools, not just on podiums?",
      "Which interventions have evidence behind them?",
      "How do families, teachers, and students describe the same policy?",
    ],
    coverageFocus: [
      "District accountability",
      "Curriculum changes",
      "Access and equity",
    ],
    cadence: "Weekly digest and source-backed features",
  },
  {
    slug: "technology-ai",
    name: "Technology and AI",
    kicker: "Platforms and systems",
    description:
      "Artificial intelligence, platform power, cybersecurity, and digital infrastructure covered without hype cycles or panic framing.",
    landingIntro:
      "This desk focuses on the technologies shaping work, information, and public systems, with emphasis on evidence over product theater.",
    editorialFocus:
      "Coverage tracks regulation, labor effects, infrastructure risk, platform governance, and the real-world limits of technical claims.",
    keyQuestions: [
      "What is materially changing versus being marketed as change?",
      "Who gains leverage, and who absorbs the risk?",
      "What evidence supports the scale of the claimed impact?",
    ],
    coverageFocus: [
      "AI policy and deployment",
      "Platform governance",
      "Cybersecurity and infrastructure",
    ],
    cadence: "Daily monitoring with weekly explainers",
  },
  {
    slug: "public-health",
    name: "Public Health",
    kicker: "Systems and evidence",
    description:
      "Health policy, outbreaks, hospital systems, and medical claims explained with a bias toward verified evidence and public impact.",
    landingIntro:
      "The public health desk covers the systems that shape risk, access, and trust, rather than chasing fear cycles around isolated claims.",
    editorialFocus:
      "Coverage prioritizes capacity, prevention, policy implementation, and what health authorities can actually verify in public.",
    keyQuestions: [
      "What does the available evidence confirm right now?",
      "Which populations face the greatest practical risk?",
      "How are public systems responding, and where are they failing?",
    ],
    coverageFocus: [
      "Health system capacity",
      "Outbreak and response reporting",
      "Access and equity",
    ],
    cadence: "Rolling updates with source-backed explainers",
  },
  {
    slug: "world-affairs",
    name: "World Affairs",
    kicker: "Global consequences",
    description:
      "Conflict, diplomacy, migration, trade, and international institutions covered with context, sourcing, and restraint.",
    landingIntro:
      "This desk translates global developments into public consequence instead of packaging them as permanent crisis spectacle.",
    editorialFocus:
      "Coverage emphasizes verifiable developments, strategic context, civilian impact, and the incentives behind official narratives.",
    keyQuestions: [
      "What has actually changed on the ground or in policy?",
      "Which sources are direct, and which are narrative positioning?",
      "How do these developments affect households, markets, and institutions elsewhere?",
    ],
    coverageFocus: [
      "Conflict and diplomacy",
      "Trade and supply chains",
      "Migration and humanitarian response",
    ],
    cadence: "Daily brief plus context features",
  },
  {
    slug: "justice-safety",
    name: "Justice and Public Safety",
    kicker: "Courts and accountability",
    description:
      "Courts, policing, civil rights, emergency response, and accountability systems covered without crime-theater framing.",
    landingIntro:
      "The justice and public safety desk focuses on systems, evidence, and proportionality rather than sensational incident packaging.",
    editorialFocus:
      "Coverage follows due process, institutional accountability, emergency management, and how safety policy affects different communities.",
    keyQuestions: [
      "What is verified, and what remains allegation or speculation?",
      "Which institutions are accountable for the outcome?",
      "What do the underlying records show about patterns, not just incidents?",
    ],
    coverageFocus: [
      "Court decisions and filings",
      "Policing and oversight",
      "Emergency preparedness and response",
    ],
    cadence: "Breaking updates with weekly accountability reviews",
  },
  {
    slug: "elections-policy",
    name: "Elections and Policy",
    kicker: "Power and implementation",
    description:
      "Campaigns, legislation, executive action, and regulatory change covered through governance effects rather than horse-race noise.",
    landingIntro:
      "This desk tracks who gains governing power, what they can plausibly implement, and what those decisions mean in practice.",
    editorialFocus:
      "Coverage downranks poll obsession and rhetoric, and upranks rulemaking, budget effects, implementation deadlines, and legal constraints.",
    keyQuestions: [
      "What policy change is actually on the table?",
      "Which legal or institutional limits matter here?",
      "How will implementation differ from campaign messaging?",
    ],
    coverageFocus: [
      "Legislative negotiations",
      "Election administration",
      "Executive and regulatory action",
    ],
    cadence: "Daily tracking with rapid explainers",
  },
  {
    slug: "music-arts",
    name: "Music and Arts",
    kicker: "A quieter corner",
    description:
      "Music, instrumental pieces, and gentle arts writing for readers who want a soft break from the news cycle.",
    landingIntro:
      "A small, calmer desk — listening recommendations, melodic discoveries, and quiet pieces about hobby music and art that readers can return to between heavier stories.",
    editorialFocus:
      "Pieces here are appreciative and curatorial rather than investigative. They aim for soothing context and discovery, not policy or accountability framing.",
    keyQuestions: [
      "What is this piece, and why might a reader want to spend time with it?",
      "What does it sound or feel like in plain language?",
      "Where can the reader find it?",
    ],
    coverageFocus: [
      "Listening recommendations",
      "Hobby and amateur music",
      "Quiet writing on small artworks",
    ],
    cadence: "One or two pieces per week",
  },
];

export const supportReasons = [
  {
    title: "Memberships over impressions",
    description:
      "Reader support removes the need for ad inventory, aggressive tracking, and attention-maximizing page design.",
  },
  {
    title: "Transparent sponsorship rules",
    description:
      "If institutional support exists, it is disclosed and separated from editorial decisions by a written firewall.",
  },
  {
    title: "Slow growth by design",
    description:
      "The newsroom can stay smaller and more focused instead of chasing volume that degrades quality.",
  },
];

export const correctionsLog = [
  {
    date: "April 10, 2026",
    title: "Updated a housing data chart label.",
    detail:
      "A chart label referred to permits issued rather than permits approved. The annotation and accompanying paragraph were corrected within two hours.",
  },
  {
    date: "April 6, 2026",
    title: "Clarified sourcing in a school funding explainer.",
    detail:
      "We added direct links to board minutes after a reader noted that the summary cited only the public meeting date.",
  },
];

export const supportModel = [
  "Optional monthly memberships with member briefings and newsroom notes.",
  "One-time reader contributions for specific reporting projects.",
  "Grant funding only when the terms preserve editorial independence.",
  "No behavioral advertising, paid recommendations, or sponsored stories in the feed.",
];

export const authors: Author[] = [
  {
    name: "Maya Chen",
    slug: "maya-chen",
    role: "Senior civic affairs reporter",
    bio: "Maya covers city budgets, procurement, and the practical effects of public decisions on daily life.",
    credentials: "Previously reported on municipal accountability and transport policy.",
    coverageAreas: ["City budgets", "Transit governance", "Housing accountability"],
    editorialPrinciples: [
      "Translate institutional jargon into service consequences.",
      "Prefer source documents to summary quotes when they diverge.",
      "End every major piece with what changes now and what stays uncertain.",
    ],
    contactNote:
      "For local records, budget leads, and service changes with documented impact, contact Maya through the newsroom desk.",
  },
  {
    name: "Leila Rahman",
    slug: "leila-rahman",
    role: "Climate and science editor",
    bio: "Leila focuses on evidence-heavy reporting that helps readers distinguish signal from overstatement.",
    credentials: "Background in environmental policy analysis and research editing.",
    coverageAreas: ["Grid resilience", "Climate adaptation", "Research synthesis"],
    editorialPrinciples: [
      "Separate measured evidence from institutional marketing.",
      "Quantify uncertainty instead of dramatizing it.",
      "Connect technical findings to policy and household consequences.",
    ],
    contactNote:
      "Leila is interested in source-backed climate, infrastructure, and science tips that need careful verification.",
  },
  {
    name: "Tomás Ibarra",
    slug: "tomas-ibarra",
    role: "Work and economy reporter",
    bio: "Tomás tracks wages, labor negotiations, and cost-of-living issues with a household-level lens.",
    credentials: "Former labor desk reporter with a focus on regional data reporting.",
    coverageAreas: ["Labor negotiations", "Cost of living", "Regional wage data"],
    editorialPrinciples: [
      "Interrogate averages that flatten unequal outcomes.",
      "Treat labor data as a story about power, not only prices.",
      "Use workers' accounts alongside public datasets and contract text.",
    ],
    contactNote:
      "Tomás welcomes tips related to workplace conditions, contracts, wage theft, and regional cost pressures.",
  },
];

const cityBudgetExhibit: ChartExhibit = {
  figureNumber: 1,
  title: "Proposed transit-service hours by line, off-peak vs peak",
  chartType: "bar",
  series: [
    {
      name: "Off-peak hours",
      data: [
        { x: "Line 14", y: 220 },
        { x: "Line 28", y: 195 },
        { x: "Line 33", y: 180 },
        { x: "Line 49", y: 165 },
      ],
    },
    {
      name: "Peak hours",
      data: [
        { x: "Line 14", y: 410 },
        { x: "Line 28", y: 395 },
        { x: "Line 33", y: 405 },
        { x: "Line 49", y: 400 },
      ],
    },
  ],
  xAxisLabel: "Bus line",
  yAxisLabel: "Hours per week",
  sourceNote: "Source: Draft FY2026 city budget, transit appendix.",
};

const gridUpgradesExhibit: ChartExhibit = {
  figureNumber: 1,
  title: "Mean outage duration by neighborhood resilience tier, 2020–2025",
  chartType: "line",
  series: [
    {
      name: "Tier 1 (high investment)",
      data: [
        { x: 2020, y: 4.1 },
        { x: 2021, y: 3.8 },
        { x: 2022, y: 3.2 },
        { x: 2023, y: 2.9 },
        { x: 2024, y: 2.4 },
        { x: 2025, y: 2.0 },
      ],
    },
    {
      name: "Tier 3 (low investment)",
      data: [
        { x: 2020, y: 6.2 },
        { x: 2021, y: 6.4 },
        { x: 2022, y: 6.1 },
        { x: 2023, y: 6.5 },
        { x: 2024, y: 6.8 },
        { x: 2025, y: 6.9 },
      ],
    },
  ],
  xAxisLabel: "Year",
  yAxisLabel: "Mean outage duration (hours)",
  sourceNote: "Source: Utility annual reliability filings, 2020–2025.",
};

const paycheckGapExhibit: ChartExhibit = {
  figureNumber: 1,
  title: "Inflation-adjusted wage growth by income decile, 2022–2025",
  chartType: "area",
  series: [
    {
      name: "Top decile",
      data: [
        { x: 2022, y: 0 },
        { x: 2023, y: 1.2 },
        { x: 2024, y: 2.4 },
        { x: 2025, y: 3.1 },
      ],
    },
    {
      name: "Bottom decile",
      data: [
        { x: 2022, y: 0 },
        { x: 2023, y: -1.4 },
        { x: 2024, y: -2.1 },
        { x: 2025, y: -2.6 },
      ],
    },
  ],
  xAxisLabel: "Year",
  yAxisLabel: "Real wage change (%)",
  sourceNote: "Source: Regional wage series + CPI-U; calculations by the newsroom.",
};

const attendanceExhibit: ChartExhibit = {
  figureNumber: 1,
  title: "Chronic absenteeism rate by district, 2023–2025",
  chartType: "dot",
  series: [
    {
      name: "Districts",
      data: [
        { x: "District A", y: 24 },
        { x: "District B", y: 19 },
        { x: "District C", y: 31 },
        { x: "District D", y: 22 },
        { x: "District E", y: 27 },
        { x: "District F", y: 18 },
      ],
    },
  ],
  xAxisLabel: "District",
  yAxisLabel: "Chronic absentee rate (%)",
  sourceNote: "Source: State department of education annual attendance reports.",
};

export const articles: Article[] = [
  {
    title: "What a city budget actually changes for transit, schools, and renters.",
    slug: "city-budget-transit-schools-renters",
    summary:
      "A line-item explainer on which services change, what is deferred, and where the practical effects will be felt first.",
    readTime: "8 min read",
    storyType: "reporting",
    body:
      "<p>The annual budget story is often framed as a political showdown, but most readers need something more useful: what will change in service delivery, how fast, and for whom.</p><p>This model article starts with line items that alter bus frequency, classroom staffing, and rental assistance capacity. It then links those shifts to last year’s outcomes so readers can compare promises against delivery.</p><p>Every section ends with a short plain-language note: what the decision means this month, what remains uncertain, and which documents support the claim.</p>",
    contentBlocks: [
      {
        type: "section",
        heading: "Transit changes are concentrated in off-peak service.",
        body:
          "<p>The largest service adjustments land outside commuter rush hours, which means riders with irregular shifts absorb the reduction first. That detail is easy to miss when budgets are summarized only in annual totals.</p>",
      },
      {
        type: "pull-quote",
        quote:
          "When a budget says service is 'maintained,' readers should ask whether frequency, wait times, and eligibility rules stayed the same too.",
        attribution: "Maya Chen",
        role: "Senior civic affairs reporter",
      },
      {
        type: "explainer",
        title: "What to check in a budget story",
        body:
          "A budget can appear stable even while shifting service quality. The most useful checks are line items, staffing levels, and actual service metrics from the prior year.",
        keyPoints: [
          "Look for staffing cuts hidden inside department totals.",
          "Compare proposed spending with prior-year delivery outcomes.",
          "Track implementation dates, not only approval votes.",
        ],
      },
    ],
    sources: [
      "Draft city budget and committee notes",
      "Interviews with transit planners and housing advocates",
      "Previous-year spending and delivery outcomes",
    ],
    featured: true,
    deepDive: false,
    format: "data-led",
    sourceType: "staff",
    executiveSummary: [
      "The largest service cuts land off-peak, hitting riders with irregular shifts first.",
      "Total service hours are 'maintained' on paper but average frequency drops on three lines.",
      "Housing and rental assistance funding is flat; implementation begins August 1.",
      "Administrative staffing rises 12% while frontline service hours shrink 3%.",
    ],
    leadExhibit: cityBudgetExhibit,
    sourceNotes: [
      { text: "Draft FY2026 city budget, transit appendix p.41–53.", url: "https://example.org/city-budget-2026" },
      { text: "Interview with transit planner — recorded April 9." },
      { text: "Prior-year delivery outcomes, transit department dashboard.", url: "https://example.org/transit-delivery-2025" },
    ],
    publishedOn: "2026-04-11T08:00:00.000Z",
    author: authors[0],
    topic: topicCards[0],
  },
  {
    title: "Why grid upgrades matter more than one week of dramatic weather headlines.",
    slug: "grid-upgrades-and-heat-risk",
    summary:
      "An evidence-led analysis of resilience spending, outage risk, and which infrastructure changes actually reduce heat vulnerability.",
    readTime: "6 min read",
    storyType: "analysis",
    body:
      "<p>Extreme weather coverage often isolates the dramatic event from the slower infrastructure decisions that determine who is exposed and for how long.</p><p>This analysis reviews grid maintenance schedules, transformer replacement timelines, and heat-resilience investments that affect outage risk across neighborhoods.</p><p>The point is not to minimize urgency. It is to place urgency where readers and policymakers can act on it.</p>",
    contentBlocks: [
      {
        type: "section",
        heading: "Resilience spending is meaningful only if it changes outage duration.",
        body:
          "<p>Readers should be skeptical of resilience claims that are not tied to restoration timelines, transformer replacement rates, or neighborhood-level exposure. The analysis focuses on those operational measures rather than broad promises.</p>",
      },
      {
        type: "explainer",
        title: "What counts as evidence here",
        body:
          "Utility plans, outage histories, and implementation schedules are more informative than isolated executive statements or weather graphics.",
        keyPoints: [
          "Capital plans show what has actually been funded.",
          "Outage duration matters as much as outage frequency.",
          "Neighborhood risk depends on infrastructure and social exposure together.",
        ],
      },
    ],
    sources: [
      "Utility capital plans",
      "Regional heat-risk assessment",
      "Interviews with resilience planners",
    ],
    featured: false,
    deepDive: true,
    format: "data-led",
    sourceType: "staff",
    executiveSummary: [
      "Resilience spending only reduces outage duration where capital plans actually fund transformer replacement.",
      "Tier 1 neighborhoods saw a 51% reduction in mean outage duration over 5 years; Tier 3 saw an 11% increase.",
      "Heat-vulnerability funding is flat in the current capital plan despite the trend.",
      "Restoration timelines matter more than outage frequency for heat-exposed residents.",
    ],
    leadExhibit: gridUpgradesExhibit,
    sourceNotes: [
      { text: "Utility capital plans, 2020–2025.", url: "https://example.org/utility-capital-plans" },
      { text: "Regional heat-risk assessment, EPA.", url: "https://example.org/heat-risk" },
      { text: "Interviews with three resilience planners, March 2025." },
    ],
    publishedOn: "2026-04-10T14:30:00.000Z",
    author: authors[1],
    topic: topicCards[1],
  },
  {
    title: "The paycheck-inflation gap looks different depending on which households you measure.",
    slug: "paycheck-inflation-gap-households",
    summary:
      "A reporting piece on why headline averages can obscure the experience of renters, hourly workers, and families with care costs.",
    readTime: "7 min read",
    storyType: "reporting",
    body:
      "<p>National averages are useful, but they are not the same thing as lived conditions. This story compares wage growth to category-level price increases that hit households unevenly.</p><p>Instead of asking whether inflation is up or down in the abstract, it asks which costs remain sticky for the people most exposed to them.</p><p>The result is a narrower, more honest account of who is recovering and who is still underwater.</p>",
    contentBlocks: [
      {
        type: "pull-quote",
        quote:
          "An economy can improve on paper while essential costs remain punishing for the households least able to absorb them.",
        attribution: "Tomás Ibarra",
        role: "Work and economy reporter",
      },
      {
        type: "section",
        heading: "Rent, care, and transport costs break the headline average.",
        body:
          "<p>The reporting isolates categories that remain stubborn for renters and families with care obligations. Those costs do not move in sync with the general story told by top-line inflation figures.</p>",
      },
    ],
    sources: [
      "Regional wage series",
      "Consumer expenditure survey data",
      "Union and employer interviews",
    ],
    featured: false,
    deepDive: false,
    format: "data-led",
    sourceType: "staff",
    executiveSummary: [
      "Headline wage growth is up 3.1% for the top decile and down 2.6% for the bottom decile, inflation-adjusted.",
      "Rent, care, and transport costs broke the headline average for renter households.",
      "Regional averages mask larger declines in two of five tracked metros.",
    ],
    leadExhibit: paycheckGapExhibit,
    sourceNotes: [
      { text: "Regional wage series, Federal Reserve.", url: "https://example.org/wage-series" },
      { text: "Consumer Expenditure Survey, BLS.", url: "https://example.org/cex" },
      { text: "Interviews with two union representatives and one employer." },
    ],
    publishedOn: "2026-04-09T12:00:00.000Z",
    author: authors[2],
    topic: topicCards[2],
  },
  {
    title: "Attendance panic does not help students. Better measurement might.",
    slug: "attendance-panic-better-measurement",
    summary:
      "An opinion piece arguing for clearer absenteeism reporting and targeted intervention rather than moralized narratives about decline.",
    readTime: "5 min read",
    storyType: "opinion",
    body:
      "<p>Education coverage becomes less useful when it turns every difficult trend into a morality play. Attendance is a real issue, but readers need to know which absences are chronic, which are health-related, and where interventions are actually working.</p><p>Opinion in this newsroom is labeled clearly and grounded in cited reporting rather than provocation.</p>",
    contentBlocks: [
      {
        type: "explainer",
        title: "How opinion is handled in this newsroom",
        body:
          "Opinion is explicitly labeled, kept separate from news reporting, and expected to reference verifiable evidence even when it argues for a position.",
        keyPoints: [
          "Opinion does not masquerade as straight reporting.",
          "Claims still need traceable evidence.",
          "The goal is clarity, not provocation.",
        ],
      },
    ],
    sources: [
      "District attendance releases",
      "Interviews with school social workers",
      "Attendance intervention evaluations",
    ],
    featured: false,
    deepDive: false,
    format: "data-led",
    sourceType: "staff",
    executiveSummary: [
      "Chronic absenteeism varies by 13 points across districts within the same state.",
      "Health-related absences account for roughly 40% of the difference between top and bottom districts.",
      "Two interventions with the strongest evidence base have not been adopted by the highest-absence district.",
    ],
    leadExhibit: attendanceExhibit,
    sourceNotes: [
      { text: "State department of education annual attendance reports.", url: "https://example.org/attendance" },
      { text: "Interviews with three school social workers." },
      { text: "Attendance intervention evaluations, RAND review." },
    ],
    publishedOn: "2026-04-08T10:15:00.000Z",
    author: authors[0],
    topic: topicCards[3],
  },
];
