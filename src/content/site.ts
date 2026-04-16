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

export type ArticleBlock =
  | ArticleSectionBlock
  | ArticlePullQuoteBlock
  | ArticleExplainerBlock;

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

export const dailyBrief = {
  title: "A low-noise briefing for people who want orientation, not overload.",
  items: [
    {
      title: "Three developments worth tracking",
      summary:
        "A short list of changes that carry real public consequence, each with a sentence of why it matters.",
    },
    {
      title: "One claim checked against evidence",
      summary:
        "A recurring slot for testing a public statement against primary documents or data.",
    },
    {
      title: "One explainer to save for later",
      summary:
        "Evergreen context pieces that remain useful after the immediate news cycle moves on.",
    },
  ],
};

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
    publishedOn: "2026-04-08T10:15:00.000Z",
    author: authors[0],
    topic: topicCards[3],
  },
];
