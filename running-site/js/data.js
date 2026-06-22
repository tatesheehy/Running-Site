// ============================================================
//  THE SPLITS — YOUR CUSTOMIZATION FILE
//  This is the ONLY file you need to edit to change your site.
//
//  RULES TO FOLLOW:
//  • Keep all quotes "like this" exactly as they are
//  • Keep all commas , exactly as they are
//  • Change only the TEXT inside the quotes
//  • Leave image as "" if you don't have a photo yet
//  • If something breaks, undo your last change (Cmd+Z on Mac)
// ============================================================


// ── SITE SETTINGS ──────────────────────────────────────────
// Change these to set your site name, colors, and navigation.
// ────────────────────────────────────────────────────────────
const SITE = {
  name: "RUNNING WEBSITE",
  tagline: "Track & Field Coverage",

  // The orange bar at the very top. Set to "" to hide it.
  breakingNews: "World record attempt at Oslo Diamond League tonight — Ingebrigtsen targets 3:44 in the 1500m",

  // Main brand color (the orange). Replace with any hex color code.
  accentColor: "#E8500A",

  // Navigation links in the top bar
  navLinks: [
    { label: "Articles", href: "articles.html" },
    { label: "Rankings", href: "rankings.html" },
    { label: "News",     href: "articles.html?category=News" },
    { label: "Podcast",  href: "#" },
  ],
};


// ── ARTICLES ────────────────────────────────────────────────
// Add as many articles as you want using the same format.
//
// featured: true  → the big article on the home page (only one!)
// editorsPick: true → shows in the sidebar on home page (up to 5)
// category: shown as the orange tag (ALL CAPS recommended)
// image: path to your image, e.g. "images/articles/race.jpg"
//        Leave as "" to show a dark placeholder.
// body: the full article text. Wrap paragraphs in <p>...</p>
//       For headings use <h2>...</h2> or <h3>...</h3>
// ────────────────────────────────────────────────────────────
const ARTICLES = [
  {
    id: "yomif-kejelcha-last-amateur",
    featured: true,
    editorsPick: false,
    category: "DISTANCE RUNNING",
    title: "The Last Amateur: How Yomif Kejelcha Is Rewriting Distance Running's Playbook",
    excerpt: "At a time when training data is public and everyone runs the same workouts, Ethiopia's quiet genius has found something money can't buy: a way of moving that no algorithm predicted.",
    author: "Marcus Osei",
    date: "June 18, 2026",
    readTime: "12 min read",
    image: "",
    body: `
      <p>Your full article text goes here. Add as much or as little as you want.</p>
      <h2>A Section Heading</h2>
      <p>More article text goes here. You can have multiple paragraphs.</p>
      <blockquote>A great quote from someone goes here.</blockquote>
      <p>And more text after that.</p>
    `,
  },
  {
    id: "shascarri-10-62",
    featured: false,
    editorsPick: true,
    category: "SPRINTS",
    title: "Sha'Carri's 10.62: Breaking Down the Most Important Race of the Season",
    excerpt: "A frame-by-frame look at what made the race historic.",
    author: "Maya Thornton",
    date: "June 15, 2026",
    readTime: "8 min read",
    image: "",
    body: `<p>Article body goes here...</p>`,
  },
  {
    id: "tokyo-course-record",
    featured: false,
    editorsPick: true,
    category: "MARATHON",
    title: "Why Tokyo's Course Record Means More Than Berlin's Sub-2 Mark",
    excerpt: "The debate about which marathon course is fastest misses the bigger picture.",
    author: "Priya Mehta",
    date: "June 12, 2026",
    readTime: "10 min read",
    image: "",
    body: `<p>Article body goes here...</p>`,
  },
  {
    id: "ncaa-depth-problem",
    featured: false,
    editorsPick: true,
    category: "OPINION",
    title: "The NCAA Track Season Has a Depth Problem, and Nobody Wants to Say It",
    excerpt: "The numbers don't lie. The talent pool is getting shallower.",
    author: "James Killingsworth",
    date: "June 10, 2026",
    readTime: "6 min read",
    image: "",
    body: `<p>Article body goes here...</p>`,
  },
  {
    id: "super-spikes-gear-wars",
    featured: false,
    editorsPick: true,
    category: "TECHNOLOGY",
    title: "Super Spikes, Super Problems: The Gear Wars Are Distorting Track's Record Books",
    excerpt: "When does equipment stop being an aid and start being the story?",
    author: "Leila Hassan",
    date: "June 8, 2026",
    readTime: "9 min read",
    image: "",
    body: `<p>Article body goes here...</p>`,
  },
  {
    id: "jakobs-mile-workout",
    featured: false,
    editorsPick: false,
    category: "MIDDLE DISTANCE",
    title: "Inside Jakob's Mile: A Workout-by-Workout Breakdown of the World Record",
    excerpt: "Coach Gjert Ingebrigtsen opens up on the philosophy behind the numbers.",
    author: "Marcus Osei",
    date: "June 14, 2026",
    readTime: "11 min read",
    image: "",
    body: `<p>Article body goes here...</p>`,
  },
  {
    id: "four-minute-mile-70",
    featured: false,
    editorsPick: false,
    category: "HISTORY",
    title: "The Four-Minute Mile at 70: What Roger Bannister's Record Still Teaches Us",
    excerpt: "Seven decades on, the most mythologized sub-barrier in sports remains misunderstood.",
    author: "Leila Hassan",
    date: "June 10, 2026",
    readTime: "14 min read",
    image: "",
    body: `<p>Article body goes here...</p>`,
  },
  {
    id: "shacarri-2026-season",
    featured: false,
    editorsPick: false,
    category: "SPRINTS",
    title: "Sha'Carri Richardson's 2026 Season Is Already Making History",
    excerpt: "Three Diamond League wins, a world lead, and a rivalry with Julien Alfred heating up in real time.",
    author: "Maya Thornton",
    date: "June 7, 2026",
    readTime: "7 min read",
    image: "",
    body: `<p>Article body goes here...</p>`,
  },
];


// ── ATHLETE PROFILES ────────────────────────────────────────
// These power the ranking cards that pop up when you click
// an athlete in the rankings table.
//
// The id (e.g. "jakob-ingebrigtsen") must match the athleteId
// used in RANKINGS below.
//
// photo: path to athlete image, e.g. "images/athletes/jakob.jpg"
//   → Put photos in the images/athletes/ folder
//   → Recommended size: 400px wide, any height (crop from top)
//   → Leave as "" to show a placeholder
//
// photoBackground: the color behind the photo. Use any hex code.
//   → Try dark team colors for a nice effect
//
// vitals: 4 fields shown in a grid (label on left, value on right)
//
// stats: 4 big numbers shown prominently
//   → value: the number/text shown big
//   → label: small uppercase label
//   → sub: tiny gray text below
//
// achievements: icons + counts shown at the bottom of the left panel
//   → Use any emoji as the icon
//
// traits: the icon badge grid (like The Ringer's skill tiles)
//   → emoji: any emoji
//   → label: short 1-3 word description
//
// headline: the big sentence on the right side of the card
//   → keyWord: shown in dark text
//   → rest: shown in gray (continues the sentence)
//
// analysis: the scouting report text
// ────────────────────────────────────────────────────────────
const ATHLETES = {
  "jakob-ingebrigtsen": {
    name: "Jakob Ingebrigtsen",
    country: "Norway",
    flag: "🇳🇴",
    photo: "",
    photoBackground: "#0d1b2a",

    event: "MIDDLE DISTANCE",

    vitals: {
      "HEIGHT":  "5'11\"",
      "WEIGHT":  "132 lbs",
      "AGE":     "25",
      "SEASONS": "8",
    },

    stats: [
      { value: "3:43.73", label: "WORLD RECORD",  sub: "personal best" },
      { value: "3:44.38", label: "SEASON BEST",   sub: "Oslo DL" },
      { value: "4",       label: "PODIUMS",        sub: "this season" },
      { value: "#1",      label: "WORLD RANK",     sub: "2026" },
    ],

    achievements: [
      { icon: "🥇", count: "2x", label: "Olympic Gold" },
      { icon: "🌍", count: "1x", label: "World Champ" },
      { icon: "⚡", count: "1x", label: "World Record" },
    ],

    traits: [
      { emoji: "⚡", label: "Explosive Kick" },
      { emoji: "🧠", label: "Tactical IQ" },
      { emoji: "🏔️", label: "Front Runner" },
      { emoji: "🔥", label: "Mental Edge" },
    ],

    extra: {
      "CLUB":     "Sandnes IL",
      "COACH":    "Gjert Ingebrigtsen",
      "HOMETOWN": "Sandnes, Norway",
    },

    headline: {
      keyWord: "Generational talent",
      rest: "whose numbers rewrote what we thought was possible in middle distance running.",
    },

    analysis: {
      reviewTitle: "Season review",
      reviewBody: "Ingebrigtsen has been in ruthless form this year. His front-running style has evolved — he's now just as dangerous in a tactical race as he is going wire-to-wire. The Oslo performance showed a new dimension: he can manufacture a kick from an already brutal pace.",

      questionTitle: "Next question",
      questionBody: "Can he finally crack the 3:43 barrier again? The conditions at Oslo looked right, and the pacemakers are lined up.",
    },
  },

  "yomif-kejelcha": {
    name: "Yomif Kejelcha",
    country: "Ethiopia",
    flag: "🇪🇹",
    photo: "",
    photoBackground: "#0a1a0d",

    event: "DISTANCE RUNNING",

    vitals: {
      "HEIGHT":  "5'5\"",
      "WEIGHT":  "114 lbs",
      "AGE":     "27",
      "SEASONS": "9",
    },

    stats: [
      { value: "3:47.01", label: "PERSONAL BEST",  sub: "indoor WR" },
      { value: "3:45.12", label: "SEASON BEST",    sub: "Rabat DL" },
      { value: "3",       label: "PODIUMS",         sub: "this season" },
      { value: "#2",      label: "WORLD RANK",      sub: "2026" },
    ],

    achievements: [
      { icon: "🏟️", count: "2x", label: "World Indoor Champ" },
      { icon: "💎", count: "3x", label: "Diamond League Win" },
      { icon: "📋", count: "0x", label: "Olympic Gold" },
    ],

    traits: [
      { emoji: "💨", label: "Pure Speed" },
      { emoji: "🎯", label: "Consistency" },
      { emoji: "📈", label: "Indoor King" },
      { emoji: "🤫", label: "Quiet Assassin" },
    ],

    extra: {
      "CLUB":     "Nike",
      "COACH":    "Self-coached",
      "HOMETOWN": "Bekoji, Ethiopia",
    },

    headline: {
      keyWord: "The quiet assassin",
      rest: "who keeps showing up at the finish line when it matters most.",
    },

    analysis: {
      reviewTitle: "Season review",
      reviewBody: "Kejelcha has been a model of consistency in 2026. While he hasn't grabbed the headlines, his results speak for themselves — four top-3 finishes in Diamond League events and a season best of 3:45.12 that ranks him comfortably among the world elite.",

      questionTitle: "Next question",
      questionBody: "Can he find the gear to challenge Ingebrigtsen head-to-head? Their encounters so far have gone to the Norwegian, but the gap is narrowing with each race.",
    },
  },

  "cole-hocker": {
    name: "Cole Hocker",
    country: "United States",
    flag: "🇺🇸",
    photo: "",
    photoBackground: "#1a0a0a",

    event: "MIDDLE DISTANCE",

    vitals: {
      "HEIGHT":  "6'0\"",
      "WEIGHT":  "145 lbs",
      "AGE":     "23",
      "SEASONS": "4",
    },

    stats: [
      { value: "3:46.01", label: "PERSONAL BEST",  sub: "Eugene DL" },
      { value: "3:46.01", label: "SEASON BEST",    sub: "Eugene DL" },
      { value: "2",       label: "PODIUMS",         sub: "this season" },
      { value: "#3",      label: "WORLD RANK",      sub: "2026" },
    ],

    achievements: [
      { icon: "🥇", count: "1x", label: "Olympic Gold" },
      { icon: "🎓", count: "3x", label: "NCAA Champion" },
      { icon: "🇺🇸", count: "1x", label: "American Record" },
    ],

    traits: [
      { emoji: "🚀", label: "Devastating Kick" },
      { emoji: "🧘", label: "Race Patience" },
      { emoji: "📐", label: "Perfect Form" },
      { emoji: "🌟", label: "Rising Star" },
    ],

    extra: {
      "CLUB":     "Nike",
      "COACH":    "Jerry Schumacher",
      "HOMETOWN": "Carmel, Indiana",
    },

    headline: {
      keyWord: "America's next great miler",
      rest: "who has the kick to beat anyone in the world on the right day.",
    },

    analysis: {
      reviewTitle: "Season review",
      reviewBody: "At just 23, Hocker is already running times that would have seemed impossible a generation ago for an American miler. His Olympic gold proved it wasn't a fluke — he can execute a perfect race plan and still have enough left for a devastating last 200.",

      questionTitle: "Next question",
      questionBody: "Is this the year Hocker runs a sub-3:45? The talent is there. The question is whether he can find a race with the right pacemakers and a willing front-runner.",
    },
  },

  "josh-kerr": {
    name: "Josh Kerr",
    country: "Great Britain",
    flag: "🇬🇧",
    photo: "",
    photoBackground: "#0a0a1a",

    event: "MIDDLE DISTANCE",

    vitals: {
      "HEIGHT":  "6'1\"",
      "WEIGHT":  "150 lbs",
      "AGE":     "26",
      "SEASONS": "6",
    },

    stats: [
      { value: "3:46.44", label: "PERSONAL BEST",  sub: "Budapest WC" },
      { value: "3:46.54", label: "SEASON BEST",    sub: "Rome DL" },
      { value: "2",       label: "PODIUMS",         sub: "this season" },
      { value: "#4",      label: "WORLD RANK",      sub: "2026" },
    ],

    achievements: [
      { icon: "🌍", count: "1x", label: "World Champion" },
      { icon: "🥈", count: "1x", label: "Olympic Silver" },
      { icon: "💎", count: "2x", label: "DL Champion" },
    ],

    traits: [
      { emoji: "💪", label: "Raw Strength" },
      { emoji: "🏃", label: "Mid-Race Surge" },
      { emoji: "🧠", label: "Race Savvy" },
      { emoji: "🏋️", label: "Physical Power" },
    ],

    extra: {
      "CLUB":     "Adidas",
      "COACH":    "Gary Lough",
      "HOMETOWN": "Edinburgh, Scotland",
    },

    headline: {
      keyWord: "The power runner",
      rest: "who turns middle distance into a strength competition and usually wins.",
    },

    analysis: {
      reviewTitle: "Season review",
      reviewBody: "Kerr continues to be one of the most physically imposing presences in the 1500m field. His ability to surge mid-race and break the competition is unmatched — when he goes, others have to respond or die trying. Rome showed he's in excellent form.",

      questionTitle: "Next question",
      questionBody: "Can Kerr position himself for another world title? His head-to-head with Hocker and Ingebrigtsen will define whether he can win another championship gold.",
    },
  },

  "timothy-cheruiyot": {
    name: "Timothy Cheruiyot",
    country: "Kenya",
    flag: "🇰🇪",
    photo: "",
    photoBackground: "#0a1a0a",

    event: "MIDDLE DISTANCE",

    vitals: {
      "HEIGHT":  "5'10\"",
      "WEIGHT":  "128 lbs",
      "AGE":     "28",
      "SEASONS": "8",
    },

    stats: [
      { value: "3:28.41", label: "PERSONAL BEST",  sub: "1 mile equiv." },
      { value: "3:47.22", label: "SEASON BEST",    sub: "Shanghai DL" },
      { value: "1",       label: "PODIUMS",         sub: "this season" },
      { value: "#5",      label: "WORLD RANK",      sub: "2026" },
    ],

    achievements: [
      { icon: "🌍", count: "2x", label: "World Champion" },
      { icon: "🥈", count: "1x", label: "Olympic Silver" },
      { icon: "💎", count: "4x", label: "Diamond League Win" },
    ],

    traits: [
      { emoji: "🦁", label: "Killer Instinct" },
      { emoji: "🏆", label: "Championship DNA" },
      { emoji: "🎖️", label: "Proven Winner" },
      { emoji: "🔄", label: "Long Stride" },
    ],

    extra: {
      "CLUB":     "Iten Training Camp",
      "COACH":    "Patrick Sang",
      "HOMETOWN": "Kericho, Kenya",
    },

    headline: {
      keyWord: "The veteran champion",
      rest: "who knows exactly where he needs to be at the bell and how to finish.",
    },

    analysis: {
      reviewTitle: "Season review",
      reviewBody: "Cheruiyot has shown signs of returning to his dominant best after a couple of injury-interrupted campaigns. His Shanghai win was a reminder that when he's right, he can run with anyone in the world.",

      questionTitle: "Next question",
      questionBody: "Is this a true comeback season or a false dawn? The Shanghai performance was encouraging, but the Oslo Diamond League will be the real test.",
    },
  },
};


// ── RANKINGS ────────────────────────────────────────────────
// The tab label (e.g. "1500m") is what appears as a button.
// athleteId must exactly match a key in ATHLETES above.
// Add as many events and athletes as you want.
//
// HOW TO ADD A NEW EVENT:
//   "5000m": [
//     { rank: 1, athleteId: "your-athlete-id", seasonBest: "12:58.39", meet: "Paris DL" },
//   ],
//
// HOW TO ADD A NEW ATHLETE:
//   1. Add their profile to the ATHLETES section above
//   2. Add them to a rankings list below
// ────────────────────────────────────────────────────────────
const RANKINGS = {
  "1500m": [
    { rank: 1, athleteId: "jakob-ingebrigtsen",  seasonBest: "3:44.38", meet: "Oslo DL" },
    { rank: 2, athleteId: "yomif-kejelcha",       seasonBest: "3:45.12", meet: "Rabat DL" },
    { rank: 3, athleteId: "cole-hocker",          seasonBest: "3:46.01", meet: "Eugene DL" },
    { rank: 4, athleteId: "josh-kerr",            seasonBest: "3:46.54", meet: "Rome DL" },
    { rank: 5, athleteId: "timothy-cheruiyot",    seasonBest: "3:47.22", meet: "Shanghai DL" },
  ],
  "100m": [
    // Add 100m athletes here — use the same format as above
  ],
  "Marathon": [
    // Add marathon athletes here
  ],
};

// The year shown in the rankings header
const RANKINGS_YEAR = "2026";
