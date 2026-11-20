//fields Recall covers. Data science has the full module; the other fields have a starter set of skills
//and five sample questions each, so a person can try the field before its full module is ready.

export interface SampleQuestion { id: string; skill: string; stem: string; options: Record<string, string>; key: string; why: string }
export interface Field { id: string; name: string; status: 'full' | 'starter'; blurb: string; roles: string[]; skills: string[]; samples: SampleQuestion[] }

export const FIELDS: Field[] = [
  {
    id: 'data-science', name: 'Data science', status: 'full',
    blurb: '10 skills, 40 questions and 3 work scenarios, ranked by real job postings.',
    roles: ['Data analyst', 'Data scientist', 'Business analyst', 'ML engineer'],
    skills: ['Data cleaning', 'Exploring and plotting data', 'Probability', 'Statistical inference', 'Regression', 'Causal thinking', 'Machine learning basics', 'Bayesian modeling', 'Python and SQL', 'Communicating results'],
    samples: [],
  },
  {
    id: 'software', name: 'Software engineering', status: 'starter',
    blurb: 'Starter set: 6 skills and 5 sample questions.',
    roles: ['Software engineer', 'Front-end developer', 'Back-end developer'],
    skills: ['Data structures', 'Algorithms and complexity', 'Git and code review', 'Testing', 'Web basics', 'Databases'],
    samples: [
      { id: 'se-1', skill: 'Algorithms and complexity', stem: 'You look up a value in a sorted array of one million items with binary search. About how many steps does it take?',
        options: { A: 'About 20 steps', B: 'About 1,000 steps', C: 'About 500,000 steps', D: 'About 1,000,000 steps' }, key: 'A',
        why: 'Binary search halves the range each step, and 2 to the 20th is about one million.' },
      { id: 'se-2', skill: 'Data structures', stem: 'You need to check many times whether a user ID has been seen before. Which structure fits best?',
        options: { A: 'A sorted list, searched from start to end', B: 'A hash set, with constant-time lookups', C: 'A stack, popping items until a match', D: 'A queue, reading items in arrival order' }, key: 'B',
        why: 'A hash set answers "have I seen this?" in about constant time on average.' },
      { id: 'se-3', skill: 'Git and code review', stem: 'You committed to main by mistake and have not pushed. What keeps your work and moves it to a new branch?',
        options: { A: 'Delete the folder and clone the repo again', B: 'Run git push --force to overwrite main', C: 'Create a branch here, then reset main back', D: 'Copy the files out and run git init again' }, key: 'C',
        why: 'A new branch keeps the commit; resetting main moves main back without losing work.' },
      { id: 'se-4', skill: 'Testing', stem: 'A function passes its tests but fails for an empty list in production. What is the best next step?',
        options: { A: 'Add a test for the empty list, then fix the code', B: 'Fix the code and skip tests, since they missed it', C: 'Wrap every call in try and catch to hide errors', D: 'Remove empty lists from all inputs before calling it' }, key: 'A',
        why: 'A failing test first proves the bug and guards against it coming back.' },
      { id: 'se-5', skill: 'Web basics', stem: 'A form sends a password to the server. Which HTTP method and protocol should it use?',
        options: { A: 'GET over HTTP, with the password in the URL', B: 'POST over HTTPS, with the password in the body', C: 'GET over HTTPS, with the password in the URL', D: 'POST over HTTP, with the password in a cookie' }, key: 'B',
        why: 'HTTPS encrypts the request, and the body keeps the password out of URLs and logs.' },
    ],
  },
  {
    id: 'business', name: 'Business and marketing analytics', status: 'starter',
    blurb: 'Starter set: 6 skills and 5 sample questions.',
    roles: ['Marketing analyst', 'Business analyst', 'Growth analyst'],
    skills: ['Funnels and conversion', 'Cohorts and retention', 'Unit economics', 'Experiments', 'Spreadsheets', 'Presenting to stakeholders'],
    samples: [
      { id: 'bm-1', skill: 'Funnels and conversion', stem: '1,000 people visit, 200 add to cart and 50 buy. What is the cart-to-purchase rate?',
        options: { A: '5 percent', B: '20 percent', C: '25 percent', D: '50 percent' }, key: 'C',
        why: '50 buyers out of 200 carts is 25 percent. The 5 percent is visit to purchase.' },
      { id: 'bm-2', skill: 'Unit economics', stem: 'A customer pays $20 a month and stays 10 months on average. It costs $150 to win one. What is the lifetime value to cost ratio?',
        options: { A: 'About 0.75 to 1', B: 'About 1.3 to 1', C: 'About 7.5 to 1', D: 'About 13 to 1' }, key: 'B',
        why: 'Lifetime value is $20 times 10, which is $200, and $200 over $150 is about 1.3.' },
      { id: 'bm-3', skill: 'Cohorts and retention', stem: 'Total users grew all year, but each monthly cohort keeps fewer people than the one before. What does this mean?',
        options: { A: 'Retention is fine, since total users went up all year', B: 'New sign-ups hide that retention is getting worse', C: 'Cohorts are too small to read, so ignore the trend', D: 'Older cohorts are growing, which lifts the total' }, key: 'B',
        why: 'Growth in sign-ups can mask falling retention, which cohort charts reveal.' },
      { id: 'bm-4', skill: 'Experiments', stem: 'An email test shows version B wins after one day, with 40 opens each. What should you do?',
        options: { A: 'Ship B now, since it is already ahead', B: 'Keep the test running to the planned size', C: 'Stop the test and send A to everyone', D: 'Restart the test with a brand new email' }, key: 'B',
        why: 'Stopping early on small numbers makes chance wins look real.' },
      { id: 'bm-5', skill: 'Presenting to stakeholders', stem: 'Your manager has two minutes before a meeting. How do you open your update?',
        options: { A: 'With the method and the data you used', B: 'With the result and what to decide next', C: 'With every chart you made this week', D: 'With the open questions you still have' }, key: 'B',
        why: 'Leading with the result and the decision fits the time the reader has.' },
    ],
  },
  {
    id: 'ux', name: 'Product and UX design', status: 'starter',
    blurb: 'Starter set: 6 skills and 5 sample questions.',
    roles: ['Product designer', 'UX researcher', 'Product manager'],
    skills: ['User research', 'Usability testing', 'Information architecture', 'Accessibility', 'Prototyping', 'Product metrics'],
    samples: [
      { id: 'ux-1', skill: 'Usability testing', stem: 'About how many users does a small usability test need to find most major problems in one flow?',
        options: { A: 'About 1 user', B: 'About 5 users', C: 'About 50 users', D: 'About 500 users' }, key: 'B',
        why: 'Around five users usually surface most major problems in a single flow.' },
      { id: 'ux-2', skill: 'User research', stem: 'Which interview question gives the most useful answer about past behavior?',
        options: { A: 'Would you use an app that does this for you?', B: 'Tell me about the last time you did this task.', C: 'How much would you pay for a tool like this?', D: 'Do you agree that this task is frustrating?' }, key: 'B',
        why: 'Asking about a real past event avoids guesses about the future and leading wording.' },
      { id: 'ux-3', skill: 'Accessibility', stem: 'What is the minimum contrast ratio WCAG AA asks for normal body text?',
        options: { A: '2 to 1', B: '3 to 1', C: '4.5 to 1', D: '7 to 1' }, key: 'C',
        why: 'AA asks for 4.5 to 1 for normal text and 3 to 1 for large text.' },
      { id: 'ux-4', skill: 'Information architecture', stem: 'You want to learn how users group 40 help articles. Which method fits best?',
        options: { A: 'An open card sort with target users', B: 'A five-second test of the home page', C: 'A heat map of clicks on the old menu', D: 'A survey asking which page they like' }, key: 'A',
        why: 'An open card sort shows the groups and labels users make themselves.' },
      { id: 'ux-5', skill: 'Product metrics', stem: 'A new feature raised daily sign-ups by 10 percent. What should you check before calling it a win?',
        options: { A: 'Whether the team liked the new design', B: 'Whether the new users stay and return', C: 'Whether the button color was on brand', D: 'Whether sign-ups rose on one single day' }, key: 'B',
        why: 'Sign-ups only matter if the people who join keep using the product.' },
    ],
  },
]

export const fieldById = (id: string | null | undefined) => FIELDS.find(f => f.id === id)
