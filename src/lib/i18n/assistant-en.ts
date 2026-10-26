// Assistant texts. See assistant-ru.ts for the notes.

const assistant = {
  open: "Ask",
  openLabel: "Open the assistant",
  title: "MediaMap assistant",
  intro:
    "Hello! I answer questions about MediaMap: what kinds of violations " +
    "there are, how to report them and what happens next.",
  caution:
    "Answers come from AI and may be wrong. Don't share names, phone " +
    "numbers or other personal data — the conversation is not saved.",
  suggestions: [
    "What is MediaMap?",
    "How do I report a violation?",
    "What happens after I submit?",
    "How can I check if something is true?",
  ],
  placeholder: "Your question",
  send: "Send",
  stop: "Stop",
  close: "Close",
  clear: "Start over",
  toReport: "Report a violation",
  thinking: "Thinking…",
  left: "Characters left: {n}",
  you: "You",
  bot: "Assistant",

  errors: {
    wait: "Too many questions in a row. Try again in {n} s.",
    off: "The assistant is unavailable right now.",
    busy: "The assistant is overloaded right now. Please try later.",
    long: "The question is too long — please shorten it.",
    failed: "Couldn't answer. Please try again a bit later.",
  },
};

export default assistant;
