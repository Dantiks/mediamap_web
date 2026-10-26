/*
  English texts for the newer sections: analytics, search, resources,
  glossary, quizzes, donor banners.

  A separate file, mirroring sections-ru.ts key for key. Both are read as one
  object by the dictionary, so a key missing here would be a compile error,
  not a silent gap on the page.
*/

const sections = {
  partners: {
    title: "Supported by",
    donors: "Donors",
    partners: "Partners",
    executor: "Project implementer",
  },

  analyticsPage: {
    title: "Analytics",
    lead:
      "What the reports we have received add up to. Both confirmed cases and " +
      "those still in the queue are counted.",

    /* The honest caveat. The section is public, and people are entitled to
       know that part of these numbers are unverified reports which may not
       hold up. */
    scopeNote:
      "Unverified reports are counted too. These are what people told us, " +
      "not established facts: some will not be confirmed.",
    scopeConfirmed: "of them confirmed by review",

    totalTitle: "Reports in total",
    typesTitle: "By type of violation",
    typesLead: "The share of each type among all reports.",
    trendTitle: "Over the past year",
    trendLead:
      "By month, each type separately. All three share one scale — otherwise " +
      "charts that look alike would mean different numbers.",
    sourcesTitle: "Where it happens",
    sourcesLead: "The platforms people complain about most.",
    regionsTitle: "By region",
    regionsLead: "Naming a region is optional, so not every report is here.",

    confirmed: "confirmed",
    pending: "under review",
    rejected: "not confirmed",
    empty: "No data yet — at least one report is needed.",
    regionUnknown: "Region not given",
    sourceUnknown: "Platform not given",
  },

  searchPage: {
    title: "Search",
    lead: "Searches cases, the digest, violation types and the glossary.",
    placeholder: "What to look for",
    action: "Search",
    hint: "Type at least two characters.",
    nothing: "Nothing found for “{q}”.",
    nothingHint: "Try a single word instead of a phrase.",
    found: "Found: {n}",

    groupCases: "Cases",
    groupNews: "Media digest",
    groupTypes: "Types of violations",
    groupGlossary: "Glossary",
  },

  resourcesPage: {
    title: "Useful resources",
    lead:
      "Where to go if you want to check something yourself. These are other " +
      "people’s sites — we neither run them nor answer for what is on them.",

    groupVerify: "Tools for checking things yourself",
    groupFactcheck: "Organisations that check full time",
    groupFreedom: "Free speech and protection of journalists",

    /* Notes on each resource. The key is the id from src/lib/resources.ts. */
    notes: {
      factCheckExplorer:
        "A search across checks already published: someone may have looked " +
        "into this claim before you.",
      tineye: "Reverse image search. Shows where a picture appeared earlier.",
      bellingcat:
        "Open-source investigations, and teaching material on how to run them.",
      ifcn:
        "An association of fact-checking organisations and the code of " +
        "principles they work by.",
      factcheckOrg: "Checks of public statements, with the sources shown.",
      snopes: "The oldest archive of debunked rumours and hoaxes.",
      cpj: "Pressure on journalists, country by country, our region included.",
      article19: "Freedom of expression: research and legal analysis.",
      internews:
        "Media support programmes; MediaMap was made under one of them.",
    },

    localTitle: "No Kyrgyzstani resources here yet",
    localBody:
      "We would rather not add a link at random. If you know a local project " +
      "that belongs here, write to us and we will add it.",
  },

  glossaryPage: {
    title: "Glossary",
    lead:
      "Words that come up in our write-ups and in the digest. Short, and " +
      "without sending you to another word on the same list.",
    typeLink: "More about this type of violation",
  },

  quizPage: {
    title: "Test yourself",
    lead:
      "Scenario questions on recognising hate speech: telling criticism " +
      "and opinion from discrimination, a threat from harshness, an " +
      "investigation from blaming a whole group.",
    howTitle: "How it works",
    howBody:
      "Choose the one best-founded answer — an explanation opens after " +
      "it. In real cases you assess not a single phrase but the context, " +
      "the target, the intent, the speaker's status, the reach, the " +
      "evidence and the likely consequences. Not every rude remark is " +
      "hate speech, and not every harmful call is a call for physical " +
      "violence.",
    testsTitle: "Quizzes",
    questionsCount: "{count} questions",
    start: "Take the quiz",
    back: "All quizzes",
    questionLabel: "Question {n} of {total}",
    correct: "Correct",
    wrong: "Incorrect",
    rightAnswer: "The right answer:",
    why: "Why:",
    progress: "Answered: {done} of {total}",
    resultTitle: "Your score",
    result: "{score} of {total}",
    resultBody:
      "The explanations stay under each question, so you can come back to " +
      "them.",
    retry: "Try again",
    next: "Next quiz",
    disclaimer:
      "These quizzes are for media literacy and moderation training, not " +
      "for legal conclusions. Legal definitions of protected " +
      "characteristics, incitement and threats differ between countries; " +
      "ambiguous cases need assessing in context. All scenarios are " +
      "teaching reconstructions, not quotes from real publications.",
    sourceNote: "",
    seeAlsoTitle: "To go deeper",
    seeAlsoBody:
      "The violation types and the glossary explain the same ideas in " +
      "more detail.",
    toTypes: "Types of violations",
    toGlossary: "Glossary",
  },
};

export default sections;
