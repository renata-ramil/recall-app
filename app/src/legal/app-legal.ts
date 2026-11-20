//privacy policy, terms and security notes for the main app, shown at sign-up and from Profile
import type { Section } from '../pilot/legal'
import { TERMS_VERSION } from '../auth/account'

export const UPDATED = `Last updated ${new Date(TERMS_VERSION + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

export const APP_PRIVACY: Section[] = [
  { h: 'Who runs Recall', p: ['Recall is a prototype built by Renata Ziiangaraeva as a student project at Minerva University. It is not a company and does not sell data.'] },
  { h: 'What Recall keeps', p: [
    'Your account: name, email, the date you accepted these terms, and the dates of your last 10 log-ins.',
    'Your setup: target roles, field, when you finished your program, your goal, time per day, reminder time, and the topics you picked with how confident you feel.',
    'Your practice: which answers you chose, whether they were right, how sure you were, and when.',
  ] },
  { h: 'Where it is kept', p: [
    'In this version your account, setup and practice stay in your browser on this device. They are not sent to a server, and nobody else can see them.',
    'Feedback you choose to send is the one exception: its type, your message and the screen you sent it from go to a private Google Sheet that only Renata can open. It never includes your name or email.',
    'Your password is never stored. Recall keeps only a salted hash of it, so even someone with your device storage cannot read it.',
  ] },
  { h: 'Transcripts and grades', p: ['A transcript you upload is read once to find course names and then deleted. Grades are optional and used only to set starting estimates.'] },
  { h: 'What Recall never does', p: ['No ads, no tracking cookies, no selling or sharing of your data, and no location.'] },
  { h: 'Your choices', p: [
    'Download a copy of everything in Account, under "Download my data".',
    'Delete your account and all practice data in Account, under "Delete account". It cannot be undone.',
    'Turn reminders off or on in Profile.',
  ] },
  { h: 'Changes', p: ['If this policy changes, Recall asks you to accept the new version before you continue.'] },
]

export const APP_TERMS: Section[] = [
  { h: 'What Recall is', p: ['Recall is a free practice app for recent graduates. It helps you keep skills from your program. It is not a course, a test, a credential or career advice.'] },
  { h: 'Your account', p: ['Use your own email and a password you do not use elsewhere. You are responsible for activity on your account on your device.'] },
  { h: 'Fair use', p: ['Do not try to break, overload or copy the app or its questions.'] },
  { h: 'The content', p: ['The questions, scenarios and explanations belong to Recall. You may use them for your own practice.'] },
  { h: 'No guarantees', p: ['Fade estimates and questions can be wrong. The app may change, pause or stop while it is a prototype.'] },
  { h: 'Age', p: ['You must be 18 or older to create an account.'] },
  { h: 'Leaving', p: ['You can delete your account at any time in Account.'] },
]

export const SECURITY: Section[] = [
  { h: 'Your password', p: ['Passwords need at least 8 characters with a letter and a number. Recall stores a salted PBKDF2 hash with 150,000 rounds, never the password itself.'] },
  { h: 'Log-in messages', p: ['A failed log-in says only that the email and password do not match, so the form does not reveal which emails have accounts.'] },
  { h: 'Where data lives', p: ['This version keeps your data in your browser on this device. Clearing your browser data removes it.'] },
  { h: 'Shared devices', p: ['Log out when you finish on a shared computer. Logging out keeps your data on this device but locks the app until you log in again.'] },
  { h: 'Connection', p: ['Recall is served only over HTTPS, so pages and answers cannot be read on the way.'] },
]

export const HELP: Section[] = [
  { h: 'Can I try Recall without signing up?', p: ['Yes. Choose "Try the demo" on the first screen, or log in with demo@recall.app and the password demo2026. The demo account already has a week of practice. Like every account in this version, it lives only on your device.'] },
  { h: 'How does Recall pick my skills?', p: ['Each skill gets a priority from how likely you are to have forgotten it and how often job postings for your target roles ask for it. Each session takes the top ones.'] },
  { h: 'What do faded, fading soon and solid mean?', p: ['Solid means you likely still remember it. Fading soon means it will need practice in the next few days. Faded means it is time to practice it now.'] },
  { h: 'What does "I don\'t know" do?', p: ['It counts as a miss without a guess, which gives the forgetting model a cleaner signal than a lucky guess.'] },
  { h: 'Can I change my roles or field?', p: ['Yes. Roles are in Profile, and fields are in Profile under "Fields".'] },
  { h: 'I forgot my password', p: ['This version keeps accounts on your device only, so there is no reset email yet. You can delete the account on this device and create a new one.'] },
]
