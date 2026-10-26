import type { QuizTest } from "./types";

/*
  Тесты «Проверь себя» на английском. Пара к ru.ts: те же задания в том же
  порядке, правильные ответы под теми же индексами.

  Перевод мой, не носителя языка и не автора документа. Перед показом
  заказчику его нужно вычитать.
*/

const tests: QuizTest[] = [
  {
    slug: "criticism",
    title: "Criticism, opinion and discrimination",
    questions: [
      {
        text: "A post reads: “The ministry botched the reform, and its leadership should resign.” What is the assessment based on — criticism of actions or an attack on a protected group?",
        options: [
          "It is criticism of performance and a political judgement, as long as the text contains no other attacks on a group",
          "It is hate speech because the statement is sharply negative",
          "It is discrimination because it calls for a resignation",
          "It is a call for violence against officials",
        ],
        answer: 0,
        why: "Criticism of decisions, institutions and officials is not hate speech in itself.",
      },
      {
        text: "An author writes: “I disagree with religious teaching X: I think its views on education are outdated.” What matters most in assessing this?",
        options: [
          "Any criticism of a religion is automatically an attack on believers",
          "Telling criticism of ideas apart from demeaning people because of their religion",
          "Treating the phrase as hate speech if it was published openly",
          "Removing the post if it might upset someone",
        ],
        answer: 1,
        why: "Criticism of beliefs and ideas is different from discriminating against or demeaning people because of their religion.",
      },
      {
        text: "A post claims: “People of this ethnicity are criminals by nature; don't rent housing to them.” How is the statement best classified?",
        options: [
          "An acceptable general opinion with no consequences",
          "Only criticism of the behaviour of particular individuals",
          "Stereotyping and a call to discriminate on ethnic grounds",
          "Investigative journalism, because the author reports a conclusion",
        ],
        answer: 2,
        why: "Attributing innate criminality to a whole ethnic group and urging that they be refused housing is a discriminatory generalisation.",
      },
      {
        text: "A journalist publishes an investigation into corruption at an organisation headed by a member of a minority. The piece includes documents, comments from both sides and verifiable episodes; the head's background is not linked to the corruption. What is this?",
        options: [
          "Hate speech, because the person concerned belongs to a minority",
          "An investigation into the actions of a specific organisation and its head",
          "Discrimination against everyone of the same ethnicity",
          "A call to exclude a group from public life",
        ],
        answer: 1,
        why: "A focus on the verifiable actions of specific people, without shifting the blame onto a group, is not hate speech.",
      },
      {
        text: "The phrase: “These officials are irresponsible and dishonest.” No ethnicity, religion or other protected characteristic is mentioned. Which conclusion is best founded?",
        options: [
          "It is automatically hate speech because of the insulting tone",
          "It is necessarily a threat of physical harm",
          "Rudeness alone is not enough: look at who is addressed, the context and the content",
          "It is discrimination on ethnic grounds",
        ],
        answer: 2,
        why: "A negative judgement can be rude, but not every insult is tied to a protected characteristic or to incitement.",
      },
      {
        text: "A user writes: “I think the state should limit funding for religious schools.” What best describes this?",
        options: [
          "A political opinion about state policy",
          "A call to attack believers",
          "Proof that the author hates all believers",
          "A direct threat to a religious community",
        ],
        answer: 0,
        why: "A proposal about policy towards institutions is not in itself the same as hostility towards people.",
      },
      {
        text: "In the comments under criticism of a particular politician, another user replies: “Don't discuss his decisions — he's from group X, so he can't be trusted.” What risk does this show?",
        options: [
          "Neutral fact-checking",
          "Shifting the assessment from the politician's actions to his group membership and relying on prejudice",
          "Ordinary criticism of the politician's programme",
          "An investigation with independent evidence",
        ],
        answer: 1,
        why: "Group membership is used as a reason for distrust instead of an analysis of actions or evidence.",
      },
    ],
  },
  {
    slug: "stereotypes",
    title: "Characteristics, stereotypes and discrimination",
    questions: [
      {
        text: "An employer writes in a job ad: “Members of group X need not apply — customers don't like them.” How should this be assessed?",
        options: [
          "As an ordinary commercial preference with no ethical risks",
          "As possible direct discrimination in hiring on the basis of group membership",
          "As criticism of each candidate's professional skills",
          "As investigative journalism",
        ],
        answer: 1,
        why: "Turning candidates away because of their group rather than their qualifications points to discrimination.",
      },
      {
        text: "A report says: “Three thefts took place in the district; police suspect two specific individuals.” The author does not name their ethnicity. What matters when checking it?",
        options: [
          "Adding the suspects' ethnicity so the audience can judge the group",
          "Presenting all residents of the district as dangerous",
          "Keeping the focus on confirmed facts and the specific suspects, without generalising to a group",
          "Treating any crime report as hate speech",
        ],
        answer: 2,
        why: "Reporting a crime should not turn into collective blame of a group.",
      },
      {
        text: "A post says: “People with disabilities are useless and shouldn't work with customers.” What is key here?",
        options: [
          "It is an assessment of a particular employee's performance",
          "It is a generalised put-down and support for excluding people because of disability",
          "It is a neutral discussion of workplace accessibility",
          "It is a verifiable claim that needs no context",
        ],
        answer: 1,
        why: "The statement attributes inferiority to a whole group and justifies exclusion on a protected characteristic.",
      },
      {
        text: "An author discusses crime statistics and writes: “All migrants are criminals — kick them out.” Even if some figures in the piece are correct, what remains the problem?",
        options: [
          "Correct figures automatically make any conclusion acceptable",
          "There is no problem if the author is confident in their position",
          "The leap from data on individual cases to collective guilt and a call to exclude a group",
          "It is purely a matter of style",
        ],
        answer: 2,
        why: "A factual fragment does not justify an unfounded generalisation and a discriminatory call.",
      },
      {
        text: "In a satirical post the author portrays group X as parasites “infecting” the city and suggests “cleaning up the streets”. What should be taken into account?",
        options: [
          "Satire always exempts a statement from assessment",
          "The metaphor may dehumanise the group; the purpose of the joke, the context and a possible reading as a call to expel them matter",
          "If the word “kill” is not there, there is no risk",
          "Hate speech is only possible in news articles",
        ],
        answer: 1,
        why: "A satirical form does not rule out dehumanisation or incitement.",
      },
      {
        text: "An author writes: “Some managers from group X abused their power,” gives names and documents, and stresses separately that the conclusion does not apply to the whole group. How is this best assessed?",
        options: [
          "It is necessarily hate speech, because a group is named",
          "It may be criticism of specific people, if the evidence is solid and generalisation is avoided",
          "It is a call to discriminate against all members of the group",
          "It is always unacceptable, even if the matter is of public interest",
        ],
        answer: 1,
        why: "Criticism of specific actions backed by evidence is different from blaming a whole group.",
      },
      {
        text: "In a debate about accessible transport a user writes: “Ramps are too expensive, so wheelchair users shouldn't travel in the city centre.” What nuance matters?",
        options: [
          "An economic argument automatically removes the discriminatory character",
          "A proposal to limit people's participation because of disability can support exclusion, even when framed as a pragmatic argument",
          "It is criticism of a particular contractor",
          "It is necessarily a direct threat",
        ],
        answer: 1,
        why: "A cost argument should be weighed together with the restriction of rights and participation it proposes.",
      },
    ],
  },
  {
    slug: "threats",
    title: "Calls for violence and threats",
    questions: [
      {
        text: "In a public channel a user writes: “Tomorrow go to family X's house and beat them up for who they are.” Which feature matters most?",
        options: [
          "It is just a sharp opinion about politics",
          "It is a direct call for physical violence against specific people, motivated by group membership",
          "It is only criticism of the family's decisions",
          "It is neutral quoting of a news item",
        ],
        answer: 1,
        why: "There are targets, a specific action and a call for violence.",
      },
      {
        text: "A speaker says: “Organisations of group X must be banned from taking part in elections.” He does not call for a physical attack. How is this described more accurately?",
        options: [
          "It is a call for violence, since any restriction is physical violence",
          "It is a political proposal, but it may be discriminatory and its legal and contextual content needs assessing",
          "It cannot cause harm, since the word “kill” is not there",
          "It is an investigation",
        ],
        answer: 1,
        why: "Not every harmful or discriminatory call is a call for physical violence; the categories need to be kept apart.",
      },
      {
        text: "A user writes to a particular journalist: “I know where you live. We'll come at night and break your legs.” Which analysis is most appropriate?",
        options: [
          "It is acceptable criticism of the article",
          "It is a threat to a specific person; consider how targeted, specific and credible it is, and the context",
          "It is hate speech only if the journalist belongs to a minority",
          "It is an opinion with no possible consequences",
        ],
        answer: 1,
        why: "A threat can be aimed at a specific person regardless of any protected characteristic.",
      },
      {
        text: "A historical piece quotes a leader who called for a group to be “destroyed”. The journalist clearly names who said it and when, and condemns the call. How should the text be assessed?",
        options: [
          "Automatically consider the journalist a supporter of violence",
          "Distinguish documenting or condemning a call from endorsing it; consider the framing and purpose of the quote",
          "Remove any material containing the word “destroy”",
          "Treat the quote as proof of the journalist's intent",
        ],
        answer: 1,
        why: "Quoting to inform or to condemn is different from spreading a call with approval.",
      },
      {
        text: "A politician says: “We need to deal with people like that once and for all,” right after calling a particular ethnic group “enemies”. How should this be assessed?",
        options: [
          "Ignore the previous sentences and read this one on its own",
          "Automatically consider the phrase harmless because it is ambiguous",
          "Look at the immediate context, the audience, the possible meaning of the euphemism and the risk of inciting violence",
          "Treat any metaphor as a proven call to murder",
        ],
        answer: 2,
        why: "An ambiguous phrase takes its meaning from context; the risk should be neither exaggerated nor ignored.",
      },
      {
        text: "A user writes: “I hate group X,” but proposes no action and threatens no one. Which conclusion is more accurate?",
        options: [
          "It is already a direct call for violence",
          "It is an expression of hostility; classifying it also requires looking at the content, context, target and consequences",
          "It is necessarily investigative journalism",
          "It is certainly harmless, because there is no action verb",
        ],
        answer: 1,
        why: "Expressing hatred and inciting violence are related, but not the same thing.",
      },
      {
        text: "After a rumour about a crime, an administrator posts the address of a hostel where people of group X live and writes: “Go there and show them what happens.” What raises the risk most?",
        options: [
          "The lack of an exact view count",
          "The combination of an identifiable place, a hostile context and urging the audience to act",
          "Only a grammatical error",
          "The fact that the message is short",
        ],
        answer: 1,
        why: "Naming a place and calling to act in a tense situation can make harassment or an attack easier.",
      },
    ],
  },
  {
    slug: "context",
    title: "Context, quotation and intent",
    questions: [
      {
        text: "A news site publishes a screenshot of a racist comment in an article about bullying, hides the author's name and explains why the phrase is dangerous. What matters in assessing this?",
        options: [
          "The presence of an insult means the newsroom endorses it",
          "Consider the editorial framing, the purpose of publication, the length of the quote and the steps taken against further harm",
          "Publishing any screenshot is a call to bullying",
          "The newsroom's intent does not matter under any circumstances",
        ],
        answer: 1,
        why: "Documenting and critically analysing can differ from endorsing, but the way it is presented still matters.",
      },
      {
        text: "The phrase “give our city back to our people” is heard at a rally. In other speeches the organisers called a minority “outsiders” and demanded that it be expelled. How should the slogan be read?",
        options: [
          "On its own it is always harmless",
          "Take into account the neighbouring speeches, what the words mean in this situation and whom “outsiders” refers to",
          "Any slogan about a city is automatically hate speech",
          "Context is not needed if the wording is short",
        ],
        answer: 1,
        why: "Code words and euphemisms can take on an exclusionary meaning in a particular situation.",
      },
      {
        text: "An author posts a crude phrase but says “it was a joke”. How should intent be taken into account?",
        options: [
          "Saying it was a joke automatically settles the matter",
          "Intent is one factor; the content, context, audience, repetition and likely effect also matter",
          "Intent never matters",
          "Only the author's own reaction should be assessed",
        ],
        answer: 1,
        why: "A speaker's own account of their intent does not settle the question alone; objective signs matter too.",
      },
      {
        text: "In a private chat, friends use an offensive word as a self-ironic label for their own group. Later an unknown public account uses the same word to demean that group. What changes?",
        options: [
          "Nothing: the word always has the same meaning",
          "The meaning depends on the relationship between the speakers, self-identification, the audience and the function of the word",
          "Self-irony proves the word never causes harm",
          "Public use is always safer than private use",
        ],
        answer: 1,
        why: "Context, the speaker's membership and the audience's attitude can change the meaning and impact of an expression.",
      },
      {
        text: "An editor receives a short video clip in which a man seemingly calls for “getting rid of” a group. The full recording shows he was talking about banning an extremist organisation, not about people by origin. What should be done?",
        options: [
          "Publish the clip without checking, because it is emotional",
          "Check the full recording and context before drawing conclusions about the meaning",
          "Consider the short clip sufficient proof of intent",
          "Delete all material on the topic",
        ],
        answer: 1,
        why: "A cut fragment can change the meaning substantially and lead to a false classification.",
      },
      {
        text: "An activist calls for “boycotting businesses owned by group X”, explaining that all members of the group are “guilty of the crisis”. How should this be assessed?",
        options: [
          "It is just an individual shopper's choice, so context does not matter",
          "It is a call for collective punishment on group grounds; assess the aim, the wording and the possible harm",
          "It is investigative journalism if the crisis is real",
          "It is automatically a call for physical violence",
        ],
        answer: 1,
        why: "A boycott can be a political act, but justifying it by the collective guilt of a group creates a risk of discrimination.",
      },
      {
        text: "A commentator says: “We need to protect children,” and then proposes barring all people of a certain religion from schools, calling them “a threat by nature”. Which approach is right?",
        options: [
          "Consider the stated good aim sufficient justification",
          "Assess the factual grounds and whether protective rhetoric is being used to justify excluding a group",
          "Stop analysing the content after the word “protect”",
          "Consider any security policy hate speech",
        ],
        answer: 1,
        why: "A stated aim does not remove the need to check the stereotypes, the evidence and the proposed restrictions.",
      },
    ],
  },
  {
    slug: "audience",
    title: "Speaker status, audience and reach",
    questions: [
      {
        text: "One user writes a demeaning comment about a group in a private chat of three friends. A well-known politician says something similar at a national rally. Why might the assessment differ?",
        options: [
          "Because private messages never cause harm",
          "Public status, influence on the audience, reach and the ability to mobilise people can increase the risk",
          "Because a politician's words are automatically a crime",
          "Because the meaning of words depends only on the number of followers",
        ],
        answer: 1,
        why: "The speaker's status and reach matter for the likely impact, but do not settle the classification by themselves.",
      },
      {
        text: "After a rumour about a crime, a popular blogger names the neighbourhood where group X lives and asks followers to “sort things out”. Why does the risk need especially careful assessment?",
        options: [
          "Bloggers have no real influence",
          "A large audience, a specific place and a call to act can make harassment more likely",
          "Any popular post is automatically hate speech",
          "If the blogger did not use the word “violence”, there is no risk",
        ],
        answer: 1,
        why: "Influence and spread can amplify the consequences of an ambiguous or hostile message.",
      },
      {
        text: "A local official says at an official briefing: “Don't rent housing to families from group X.” What does his position add to the analysis?",
        options: [
          "The position automatically makes the phrase true",
          "His words may be taken as an authoritative recommendation and affect how institutions and citizens behave",
          "Status has nothing to do with possible harm",
          "It is a private opinion, even if said on behalf of the agency",
        ],
        answer: 1,
        why: "Official status can lend a statement weight and raise the risk of exclusion in practice.",
      },
      {
        text: "A hostile meme appears in a small chat. A member forwards it to a large district channel with the caption “here are the addresses, act”. What has changed?",
        options: [
          "Only the format of the post",
          "The audience has grown and a caption directing people to act has been added, which can increase the risk of harm",
          "Forwarding is always neutral",
          "A large channel guarantees the message will be read as a joke",
        ],
        answer: 1,
        why: "Scale and an added call to act can turn limited circulation into a more serious risk.",
      },
      {
        text: "A talk show host invites a member of a minority, but repeatedly interrupts him and invites the audience to vote on whether “such people should live next to us”. Which aspect matters most?",
        options: [
          "It is ordinary interactive entertainment",
          "The format and the host's status can legitimise exclusion and demean the person as a member of a group",
          "If there is no direct call to fight, there is no risk",
          "The host's questions do not affect the meaning of the programme",
        ],
        answer: 1,
        why: "Hate speech can be sustained by how a conversation is set up and framed, not only by direct insults.",
      },
      {
        text: "An anonymous account threatens one person. It later turns out the message has spread to thousands of accounts and contains his home address. What matters?",
        options: [
          "Anonymity means the message cannot be assessed",
          "The threat, doxxing and the scale of spread together increase the risk to a specific person",
          "Spread does not matter after the first post",
          "It becomes criticism if the author is unknown",
        ],
        answer: 1,
        why: "Identifying details and mass circulation can increase the risk of harassment.",
      },
      {
        text: "A religious leader tells his community: “Don't hire people from group X; they will corrupt your children.” How should the speaker's role be taken into account?",
        options: [
          "A religious leader does not influence his followers' behaviour",
          "The audience's trust and his moral authority can strengthen the persuasive effect and consequences of the call",
          "The statement is acceptable just because it was made within the community",
          "It is necessarily investigative journalism",
        ],
        answer: 1,
        why: "Authority and the audience's trust matter when assessing the likely impact and incitement to discrimination.",
      },
    ],
  },
  {
    slug: "investigations",
    title: "Investigations, evidence and hard cases",
    questions: [
      {
        text: "An investigation describes cases of fraud at a charity. The author checked documents, asked the organisation for comment and does not link the fraud to the ethnicity of its staff. What sets the piece apart from hate speech?",
        options: [
          "The absence of negative facts",
          "A verifiable evidence base, a chance to respond and a focus on a specific organisation's actions rather than a group's collective guilt",
          "A mandatory absence of criticism",
          "Only a neutral headline",
        ],
        answer: 1,
        why: "Journalistic criticism can be sharp if it is evidence-based and does not turn private actions into an accusation against a group.",
      },
      {
        text: "An article quotes an eyewitness: “All people of group X are dangerous.” The newsroom does not check the claim, puts it in the headline and repeats it in teasers. What is the main risk?",
        options: [
          "Citing an eyewitness frees the newsroom from responsibility for presentation",
          "An unchecked generalisation can be amplified by editorial framing and presented as a reliable conclusion",
          "Any eyewitness quote is evidence",
          "The problem disappears if the text is long",
        ],
        answer: 1,
        why: "Attribution alone does not remove the duty to check the context and avoid amplifying harmful generalisations.",
      },
      {
        text: "An investigation names specific suspects, but before trial the headline calls them “members of group X”, although that characteristic has nothing to do with the case. What should be corrected?",
        options: [
          "Nothing: any personal characteristic adds completeness",
          "Check whether mentioning the characteristic is in the public interest, and remove it if it is irrelevant to the case and invites suspicion of the group",
          "Add the same description for all witnesses",
          "Replace the documents with emotional judgements",
        ],
        answer: 1,
        why: "An irrelevant protected characteristic can create an unfounded association between a group and a crime.",
      },
      {
        text: "After a terrorist attack, an author publishes confirmed information about a specific armed organisation but concludes: “So every person of this religion is an enemy.” What happens in the conclusion?",
        options: [
          "A logical conclusion, since the facts are confirmed",
          "An unfounded leap from the actions of a specific organisation to the collective guilt of a religious group",
          "A neutral description of facts",
          "Criticism of the organisation's leadership only",
        ],
        answer: 1,
        why: "Reliable information about an organisation does not justify shifting responsibility onto all believers.",
      },
      {
        text: "A journalist investigates discrimination in hiring: sends comparable test applications, cites documents and the employers' comments. The piece reports that some companies turn down candidates from group X. How should it be assessed?",
        options: [
          "It is automatically hate speech against employers",
          "It is an investigation of possible discrimination in the public interest, if the method and conclusions are sound",
          "It is a call for violence against the companies",
          "It is unacceptable because it touches on protected characteristics",
        ],
        answer: 1,
        why: "Discussing discrimination with evidence is not the same as discrimination or hatred.",
      },
      {
        text: "An article uses a derogatory term from a historical document. The newsroom explains its origin, keeps the quote short and does not apply the term to people in its own voice. What is best to consider?",
        options: [
          "The mere presence of the term makes the article an endorsement of its meaning",
          "Assess whether the quote is needed, the explanation, its length and how the newsroom distances itself from the derogatory language",
          "Historical material requires no editorial decisions",
          "Any explanation makes repeating the term harmless",
        ],
        answer: 1,
        why: "Historical quotation can be justified, but how it is presented and whether it needs reproducing matter.",
      },
      {
        text: "A post claims: “Group X is taking over our schools.” There are no sources, only a few photos of children from this group, followed by a proposal to ban them from school. What should the reader notice?",
        options: [
          "The photos confirm the sweeping conclusion",
          "The lack of evidence, the manipulative wording and the move to restricting the group's right to education",
          "It is a full investigation, since there is visual material",
          "It is only criticism of the curriculum",
        ],
        answer: 1,
        why: "Isolated examples do not support a sweeping claim; the conclusion is used to justify exclusion.",
      },
    ],
  },
];

export default tests;
