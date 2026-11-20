//privacy notice and terms for the pilot, shown in the app and in PILOT_SETUP.md
export interface Section { h: string; p: string[] }

export const CONTACT = 'message Rina (Renata Ziiangaraeva), who sent you this link'

export const PRIVACY: Section[] = [
  { h: 'Who runs this', p: ['Recall is a student capstone project by Renata Ziiangaraeva at Minerva University. This pilot is product testing and is exempt from further IRB review at Minerva.'] },
  { h: 'What I collect', p: [
    'Your study code. I keep the list that links codes to people separately from the answers, and I delete it when the pilot ends.',
    'Your setup answers: target roles, the month and year you finished your program, your main goal, the skills you most want to keep, time per day, reminder time, and the topics you picked with how confident you feel.',
    'Your answers in the app: which option you picked, whether it was right, how sure you were, and when you answered.',
    'Feedback you choose to send: its type, your message and the screen you sent it from.',
    'Course titles you type stay on your device. They are not sent to me.',
  ] },
  { h: 'What I do not collect', p: ['No name, email, transcript, grades, location, or tracking cookies. The pilot version has no transcript upload.'] },
  { h: 'Where it goes', p: [
    'Answers go to a Google Sheet in my own Google account, which only I can open. A copy also stays in your browser so the app works offline.',
    'I use the answers to fix the app and to check my forgetting model. In my capstone I only report results as lessons about Recall, as group totals, with no codes.',
  ] },
  { h: 'How long I keep it', p: ['I keep the answers until my capstone ends in May 2027, then I delete them. The link between codes and people is deleted when the pilot ends.'] },
  { h: 'Your choices', p: [
    'You can stop at any time. Nothing happens if you stop.',
    'Ask me to delete your answers by messaging me your study code. "Delete my data" in Profile clears the copy on your device and sends me a delete request.',
  ] },
]

export const TERMS: Section[] = [
  { h: 'What Recall is', p: ['Recall is a free prototype made for a student capstone. It is for practice only. It is not a course, a test, or career advice.'] },
  { h: 'No guarantees', p: ['The questions and the forgetting estimate can be wrong. The app may change, pause or stop during the pilot.'] },
  { h: 'Your part', p: ['Use your own study code and do not share it. Do not try to break or overload the app.'] },
  { h: 'The content', p: ['The questions and scenarios belong to me. Please do not copy them outside the pilot.'] },
  { h: 'Leaving', p: ['You can leave at any time. See the privacy notice for how to delete your answers.'] },
]
