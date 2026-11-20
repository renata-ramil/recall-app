//pilot settings in one place; the pilot build turns on with VITE_PILOT=1 (see PILOT_SETUP.md)
export const PILOT = import.meta.env.VITE_PILOT === '1'

//paste the Google Apps Script web app URL here (PILOT_SETUP.md, step 2); empty means answers stay on the device only
const PASTE_URL_HERE = ''
export const LOG_URL: string = (import.meta.env.VITE_LOG_URL as string | undefined) || PASTE_URL_HERE

export const APP_VERSION = 'pilot-1'

//pilot length and the closing check-in
export const PILOT_DAYS = 14
export const CHECKIN_FROM_DAY = 15
export const CHECKIN_PER_DAY = 5

//common last review: on day 11 every practiced skill in both halves gets one review, then practice pauses on days 12 to 14.
//So at the check on days 15 and 16 every skill has the same gap since its last review (4 to 5 days), and the check compares
//how strong each schedule made the memory, not how recently each skill was practiced.
export const COMMON_REVIEW_DAY = 11
export const PAUSE_FROM_DAY = 12

//the fixed half: reviews 1, 3, 7, 14 and 30 days after the first practice; in a 14-day pilot only 1, 3 and 7 happen before the common review
export const FIXED_DAYS = [1, 3, 7, 14, 30]

//the personalized half: a skill is due when its estimated recall falls to the fade line
export const DUE_AT = 0.6

//forgetting model values. b_right, b_wrong and the ceiling are the Duolingo fit.
//MU is a starting guess for professional skills: it gives a half-life of about 4 days after one right answer,
//because the Duolingo intercept describes single words seen many times. The pilot data refits it.
export const MODEL = {
  ceiling: 0.918,
  bRight: 0.213,
  bWrong: -0.752,
  mu: 2.45,
  //before any practice: half-life of 240 days for a skill rated 3 of 5, doubling per 2 points of confidence (a starting guess)
  startLog2Half: Math.log2(240),
  confidenceStep: 0.5,
  //harder items (difficulty 3) shorten the half-life a little, easier ones lengthen it
  difficultyStep: 0.3,
  //online update of the person's own offset after each review
  learnRate: 0.5,
  offsetLimit: 2,
}
