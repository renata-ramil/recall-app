//pilot engine: study code, the per-person skill split, practice history, the two schedules and the forgetting estimate.
//Everything lives in localStorage under its own key; every answer is also sent to the project's Google Sheet (log.ts).
import { CHECKIN_FROM_DAY, CHECKIN_PER_DAY, COMMON_REVIEW_DAY, DUE_AT, FIXED_DAYS, MODEL, PAUSE_FROM_DAY, PILOT_DAYS } from './config'
import { itemsFor, type PilotQuestion } from './bank'
import { logEvent } from './log'

export type Group = 'model' | 'fixed'
export interface Practice { day: number; at: number; itemId: string; right: boolean; dontKnow: boolean; kind: 'practice' | 'checkin' }
export interface PilotState {
  code: string
  consentAt: number | null
  startDate: string | null
  groups: Record<string, Group>
  confidence: Record<string, number>
  finished: string | null
  history: Record<string, Practice[]>
  userOffset: number
  nudgeArm: 'plain' | 'streak'
  doneDays: number[]
}

const KEY = 'recall.pilot.v1'
const DAY_MS = 86400000

function blank(): PilotState {
  return { code: '', consentAt: null, startDate: null, groups: {}, confidence: {}, finished: null, history: {}, userOffset: 0, nudgeArm: 'plain', doneDays: [] }
}
let state: PilotState = load()
function load(): PilotState {
  try { const r = localStorage.getItem(KEY); if (r) return { ...blank(), ...JSON.parse(r) } } catch { /* fresh */ }
  return blank()
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ } }
export function pilot(): PilotState { return state }
export function resetPilot() { state = blank(); save() }

//local calendar day number, so "today" follows the participant's clock
export function dayNumber(d = new Date(Date.now())): number {
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / DAY_MS)
}
function startDay(): number {
  return state.startDate ? Number(state.startDate) : dayNumber()
}
//day 1 is the day of consent
export function pilotDay(): number { return dayNumber() - startDay() + 1 }

//small seeded generator, so the split can be rebuilt from the study code if a device is lost
function seeded(seed: string) {
  let h = 2166136261
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

//setup answers the estimate needs before the split exists (the plan screen shows them)
export function setProfile(confidence: Record<string, number>, finished: string | null) {
  if (JSON.stringify(confidence) === JSON.stringify(state.confidence) && finished === state.finished) return
  state = { ...state, confidence, finished }
  save()
}

//a day with nothing due keeps the streak going
export function markRestDay() {
  const d = dayNumber()
  if (state.doneDays.includes(d)) return
  state = { ...state, doneDays: [...state.doneDays, d] }
  save()
  logEvent('rest_day')
}

export function giveConsent(code: string) {
  const clean = code.trim().toUpperCase()
  state = { ...blank(), code: clean, consentAt: Date.now(), startDate: String(dayNumber()), nudgeArm: seeded(clean + 'nudge')() < 0.5 ? 'plain' : 'streak' }
  save()
  logEvent('consent', { nudge_arm: state.nudgeArm })
}

//within-person split: shuffle the ticked skills with the code as seed, then alternate, so each half gets half the skills
export function assignGroups(ticked: string[], confidence: Record<string, number>, finished: string | null) {
  const rnd = seeded(state.code + 'split')
  const order = [...ticked].sort().map(id => ({ id, r: rnd() })).sort((a, b) => a.r - b.r).map(x => x.id)
  const first: Group = rnd() < 0.5 ? 'model' : 'fixed'
  const groups: Record<string, Group> = {}
  order.forEach((id, i) => { groups[id] = i % 2 === 0 ? first : first === 'model' ? 'fixed' : 'model' })
  state = { ...state, groups, confidence, finished }
  save()
  logEvent('split', { groups: JSON.stringify(groups), confidence: JSON.stringify(confidence), finished: finished ?? '' })
}

// ---------- the forgetting estimate ----------

function itemOffset(q?: PilotQuestion): number {
  return q ? -MODEL.difficultyStep * (q.difficulty - 2) : 0
}

//log2 half-life in days from the practice history, half-life regression form with the Duolingo slopes
function log2Half(skillId: string, upTo: number = Infinity): number {
  const h = (state.history[skillId] ?? []).filter(p => p.at < upTo)
  if (!h.length) {
    const c = state.confidence[skillId] ?? 3
    return MODEL.startLog2Half + MODEL.confidenceStep * (c - 3) + state.userOffset
  }
  const right = h.filter(p => p.right).length
  const wrong = h.length - right
  return MODEL.mu + state.userOffset + MODEL.bRight * Math.sqrt(1 + right) + MODEL.bWrong * Math.sqrt(1 + wrong)
}
export function halfLifeDays(skillId: string): number {
  return Math.pow(2, log2Half(skillId))
}

//days since the last practice, or since the end of the program before any practice
function gapDays(skillId: string, now = Date.now()): number {
  const h = state.history[skillId] ?? []
  if (h.length) return Math.max(0, (now - h[h.length - 1].at) / DAY_MS)
  if (state.finished) {
    const t = Date.parse(state.finished)
    if (!Number.isNaN(t)) return Math.min(365, Math.max(30, (now - t) / DAY_MS))
  }
  return 180
}

export function recallNow(skillId: string, now = Date.now()): number {
  return MODEL.ceiling * Math.pow(2, -gapDays(skillId, now) / halfLifeDays(skillId))
}

//plain state input for the UI: 0 means already at or under the fade line, 1 to 3 means close to it, else far
export function daysUntilFade(skillId: string): number {
  const r = recallNow(skillId)
  if (r <= DUE_AT) return 0
  const h = halfLifeDays(skillId)
  return Math.max(0, Math.floor(h * Math.log2(MODEL.ceiling / DUE_AT) - gapDays(skillId)))
}

// ---------- the two schedules ----------

function firstPracticeDay(skillId: string): number | null {
  const h = state.history[skillId] ?? []
  return h.length ? h[0].day : null
}
function lastPracticeDay(skillId: string): number | null {
  const h = state.history[skillId] ?? []
  return h.length ? h[h.length - 1].day : null
}

export function isDue(skillId: string, today = dayNumber()): { due: boolean; overdue: number } {
  const first = firstPracticeDay(skillId)
  if (first === null || lastPracticeDay(skillId) === today) return { due: false, overdue: 0 }
  if (state.groups[skillId] === 'fixed') {
    //the closing check-in counts as a review too
    const reviews = (state.history[skillId] ?? []).length - 1
    const next = FIXED_DAYS[reviews]
    if (next === undefined) return { due: false, overdue: 0 }
    return { due: today >= first + next, overdue: today - (first + next) }
  }
  const r = recallNow(skillId)
  return { due: r <= DUE_AT, overdue: DUE_AT - r }
}

export interface Plan { skillIds: string[]; checkin: boolean }

//today's session: closing check-in after the pilot, else due skills first (most overdue, then priority), then new skills
export function todaysPlan(ticked: string[], priority: (id: string) => number): Plan {
  const today = dayNumber()
  const doneToday = ticked.filter(id => lastPracticeDay(id) === today)
  if (pilotDay() >= CHECKIN_FROM_DAY) {
    const open = ticked.filter(id => (state.history[id] ?? []).length && !(state.history[id] ?? []).some(p => p.kind === 'checkin'))
    const todayChecked = ticked.filter(id => (state.history[id] ?? []).some(p => p.kind === 'checkin' && p.day === today))
    if (open.length || todayChecked.length) return { skillIds: [...todayChecked, ...open].slice(0, CHECKIN_PER_DAY), checkin: true }
  }
  //common last review: every practiced skill once, whatever its half or schedule
  if (pilotDay() === COMMON_REVIEW_DAY) {
    return { skillIds: ticked.filter(id => (state.history[id] ?? []).length), checkin: false }
  }
  //pause before the check: no practice in either half
  if (isPauseDay()) return { skillIds: [], checkin: false }
  const due = ticked.filter(id => isDue(id, today).due)
    .sort((a, b) => isDue(b, today).overdue - isDue(a, today).overdue || priority(b) - priority(a))
  const fresh = ticked.filter(id => !(state.history[id] ?? []).length).sort((a, b) => priority(b) - priority(a))
  return { skillIds: [...doneToday, ...due, ...fresh].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3), checkin: false }
}

//the item for this skill today: rotate through its four items; a check-in uses the one seen longest ago
export function itemFor(skillId: string, checkin: boolean): PilotQuestion | undefined {
  const q = pickItem(skillId, checkin)
  return q && shuffled(q)
}

//answer options in a per-person order seeded by code and item, so the right answer is not always in the same spot;
//option ids keep their bank letters, so answers and logs still use the bank's key
function shuffled(q: PilotQuestion): PilotQuestion {
  const rnd = seeded(state.code + q.id)
  const options = q.options.map(o => ({ o, r: rnd() })).sort((a, b) => a.r - b.r).map(x => x.o)
  return { ...q, options }
}

function pickItem(skillId: string, checkin: boolean): PilotQuestion | undefined {
  const items = itemsFor(skillId)
  if (!items.length) return undefined
  const h = state.history[skillId] ?? []
  const todays = h.find(p => p.day === dayNumber() && p.kind === (checkin ? 'checkin' : 'practice'))
  if (todays) return items.find(q => q.id === todays.itemId)
  if (checkin) {
    const lastSeen = (id: string) => Math.max(-1, ...h.filter(p => p.itemId === id).map(p => p.at))
    return [...items].sort((a, b) => lastSeen(a.id) - lastSeen(b.id))[0]
  }
  return items[h.filter(p => p.kind === 'practice').length % items.length]
}

//record one answer, update the person's offset, and send the row
export function recordAnswer(q: PilotQuestion, picked: string, sure: string, right: boolean, checkin: boolean) {
  const skillId = q.skillId
  const now = Date.now()
  const before = recallNow(skillId, now)
  const gap = gapDays(skillId, now)
  const hist = state.history[skillId] ?? []
  const half = halfLifeDays(skillId)
  //online step on the log likelihood of this answer, only for real reviews (not the first practice from course memory)
  let offset = state.userOffset
  if (hist.length) {
    const p = Math.min(0.999, Math.max(0.001, before))
    const g = (gap * Math.LN2 * Math.LN2) / half
    offset = Math.max(-MODEL.offsetLimit, Math.min(MODEL.offsetLimit, offset + MODEL.learnRate * ((right ? 1 : 0) - p) / (1 - p) * g))
  }
  const entry: Practice = { day: dayNumber(), at: now, itemId: q.id, right, dontKnow: sure === 'dontKnow', kind: checkin ? 'checkin' : 'practice' }
  const isRepeatToday = hist.some(p => p.day === entry.day && p.itemId === q.id && p.kind === entry.kind)
  if (isRepeatToday) return { before, after: recallTomorrow(skillId) }
  state = { ...state, userOffset: offset, history: { ...state.history, [skillId]: [...hist, entry] } }
  save()
  logEvent('answer', {
    skill: skillId, group: state.groups[skillId] ?? '', item: q.id, format: q.format, kind: entry.kind, shown_order: q.options.map(o => o.id).join(''),
    picked, sure, right: right ? 1 : 0, dont_know: entry.dontKnow ? 1 : 0, gap_days: gap.toFixed(3),
    predicted: before.toFixed(4), half_life_days: half.toFixed(2), n_before: hist.length, user_offset: offset.toFixed(3),
  })
  return { before, after: recallTomorrow(skillId) }
}

export function recallTomorrow(skillId: string): number {
  return recallNow(skillId, Date.now() + DAY_MS)
}

export function markDayDone() {
  const d = dayNumber()
  if (!state.doneDays.includes(d)) { state = { ...state, doneDays: [...state.doneDays, d] }; save() }
}

export function streak(): number {
  let n = 0
  for (let d = dayNumber(); state.doneDays.includes(d); d--) n++
  if (n === 0) for (let d = dayNumber() - 1; state.doneDays.includes(d); d--) n++
  return n
}

export function isPauseDay(): boolean {
  const d = pilotDay()
  return d >= PAUSE_FROM_DAY && d < CHECKIN_FROM_DAY
}

export function isPilotOver(): boolean {
  return pilotDay() > PILOT_DAYS && todaysPlanEmpty()
}
function todaysPlanEmpty(): boolean {
  return Object.keys(state.groups).every(id => (state.history[id] ?? []).some(p => p.kind === 'checkin') || !(state.history[id] ?? []).length)
}

//curve segments for the skill page, from the real practice days
export function curveFor(skillId: string) {
  const h = state.history[skillId] ?? []
  const today = dayNumber()
  const origin = h.length ? h[0].day : today
  const days = Math.max(42, today - origin + 7)
  const segs: { fromDay: number; toDay: number; start: number; halfLife: number }[] = []
  h.forEach((p, i) => {
    const from = p.day - origin
    const to = i + 1 < h.length ? h[i + 1].day - origin : days
    if (i + 1 < h.length && h[i + 1].day === p.day) return
    segs.push({ fromDay: from, toDay: to, start: MODEL.ceiling, halfLife: Math.pow(2, log2Half(skillId, p.at + 1)) })
  })
  if (!segs.length) segs.push({ fromDay: 0, toDay: days, start: recallNow(skillId), halfLife: halfLifeDays(skillId) })
  return { axisDays: days, todayDay: today - origin, segments: segs, practiceDays: [...new Set(h.map(p => p.day - origin))], projectionFromDay: today - origin }
}
