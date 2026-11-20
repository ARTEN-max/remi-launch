export const founderX = "https://x.com/AbdulRahmahk1x";

export const steps = [
  {
    title: "Say it out loud",
    body: "Talk to Remi the way you'd talk to a friend. No prompts, no setup, no new chat to start over.",
  },
  {
    title: "It holds the thread",
    body: "The interview, the recital, the thing you mentioned once and then forgot you'd said. It stays.",
  },
  {
    title: "It comes back",
    body: "Weeks or months later, Remi checks in on its own and asks the question a friend would ask.",
  },
] as const;

export const examples = [
  {
    when: "Three weeks later",
    line: "“Did you hear back about the interview?”",
    detail: "You said you had one on Thursday. The chat ended. Remi didn't.",
  },
  {
    when: "The week before",
    line: "“Still going to your sister's recital?”",
    detail: "You promised you'd be there on June 14. Remi kept the date.",
  },
  {
    when: "The next morning",
    line: "“How did your dad's surgery go?”",
    detail: "You mentioned it in passing, trying not to spiral. Remi checked in anyway.",
  },
] as const;

export const faqs = [
  {
    id: "privacy",
    question: "Is this private?",
    answer:
      "The waitlist keeps your email, plus an X handle or a note if you choose to leave one. That's so we can hold your place and tell you when Remi opens. We don't sell it, and we don't use it to train a model. Want off the list? DM @AbdulRahmahk1x on X and we'll delete it.",
  },
  {
    id: "launch",
    question: "When does it launch?",
    answer:
      "There's no public date. People on the list get in first, and you'll get an email when it's your turn. The work is happening in public on X.",
  },
  {
    id: "free",
    question: "Is it free?",
    answer:
      "Joining the waitlist is free. Remi will open with a free tier for people who signed up early. If money ever enters the picture, you'll hear it from us before anyone asks you to pay.",
  },
  {
    id: "referral",
    question: "How does the line work?",
    answer:
      "You get a personal link after you join. Each person who signs up with it moves you ahead of everyone who hasn't brought someone. Come back and enter the same email anytime to see your spot.",
  },
] as const;
