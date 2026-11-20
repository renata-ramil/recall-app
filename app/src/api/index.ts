//the only module that knows where model values come from; swap the mock for a backend here
import raw from './mock-data.json'
import { PILOT } from '../pilot/config'
import { daysUntilFade as pDaysUntilFade, halfLifeDays as pHalf, recallNow as pRecall } from '../pilot/engine'
import { SKILL_IDS } from '../pilot/bank'
import type { MockData, Skill, SkillState, Question, Scenario, SkillDetail, Summary, SummaryChange, Today, Topic, Transcript, Survey, Verdicts } from './types'

const data = raw as unknown as MockData

export const FADE_THRESHOLD = data.fadeThreshold
export const ROLE_OPTIONS = data.user.survey.targetRoleOptions

export function skillState(s: Pick<Skill, 'recall' | 'daysUntilFade'>): SkillState {
  if (s.recall < FADE_THRESHOLD) return 'faded'
  if (s.daysUntilFade <= 3) return 'fadingSoon'
  return 'solid'
}

//job weight from real postings: the average over the chosen roles, never below the floor
export function jobWeight(skillId: string, roles: string[]): number {
  const known = roles.filter(r => data.jobWeights.roles[r])
  const use = known.length ? known : ['Other']
  const mean = use.reduce((sum, r) => sum + (data.jobWeights.roles[r].skills[skillId]?.weight ?? 0), 0) / use.length
  return Math.max(data.jobWeights.floor, mean)
}

//one plain line per role, e.g. "Asked for in 70% of 680 data scientist postings"
export function jobWeightNotes(skillId: string, roles: string[]): string[] {
  const known = roles.filter(r => data.jobWeights.roles[r])
  const use = known.length ? known : ['Other']
  return use.map(r => {
    const role = data.jobWeights.roles[r]
    const share = Math.round((role.skills[skillId]?.share ?? 0) * 100)
    const who = r === 'Other' ? 'data job' : r.charAt(0).toLowerCase() + r.slice(1)
    return `Asked for in ${share}% of ${role.postings.toLocaleString('en-US')} ${who} postings`
  })
}

//what matters most to the person, from setup: it tilts the priority toward job match or toward weak spots
export const FOCUS_OPTIONS = ['Job match', 'Both equally', 'Weak spots'] as const
let focus: string = 'Both equally'
export function setFocus(f: string | null | undefined) { focus = f ?? 'Both equally' }

//why a skill is in today's session, in one plain line: its state and how often job postings ask for it
export function whyToday(s: Skill, roles: string[], practiced: boolean): string {
  const state = practiced ? fadeLabel(s).toLowerCase() : 'first practice'
  const notes = jobWeightNotes(s.id, roles)
  const top = notes.map(n => ({ n, v: Number(n.match(/(\d+)%/)?.[1] ?? 0) })).sort((a, b) => b.v - a.v)[0]
  return top ? `${state.charAt(0).toUpperCase()}${state.slice(1)}. ${top.n}.` : `${state.charAt(0).toUpperCase()}${state.slice(1)}.`
}

export function priority(s: Pick<Skill, 'recall' | 'jobWeight'>): number {
  //the square root softens one factor, so the other one decides more of the order
  if (focus === 'Job match') return s.jobWeight * Math.sqrt(1 - s.recall)
  if (focus === 'Weak spots') return Math.sqrt(s.jobWeight) * (1 - s.recall)
  return s.jobWeight * (1 - s.recall)
}

export function sortByPriority<T extends Pick<Skill, 'recall' | 'jobWeight' | 'daysUntilFade'>>(skills: T[]): T[] {
  return [...skills].sort((a, b) => priority(b) - priority(a) || a.daysUntilFade - b.daysUntilFade)
}

export function stateFill(state: SkillState): string {
  return state === 'faded' ? 'var(--ochre)' : state === 'fadingSoon' ? 'var(--sand)' : 'var(--mint)'
}

export function fadeLabel(s: Pick<Skill, 'recall' | 'daysUntilFade'>): string {
  const state = skillState(s)
  if (state === 'faded') return 'Faded'
  //plain states only: the model's uncertainty is too wide for a fade date
  if (state === 'fadingSoon') return 'Fading soon'
  return 'Solid'
}

export function metaLine(s: Skill): string {
  return `${fadeLabel(s)}, job weight ${s.jobWeight.toFixed(1)}`
}

//plain state words for a bare recall value; the app never shows recall as a percentage
export function recallWord(r: number): string {
  if (r < FADE_THRESHOLD) return 'Faded'
  if (r < FADE_THRESHOLD + 0.1) return 'Fading soon'
  return 'Solid'
}

const withWeight = (roles: string[]) => (s: Omit<Skill, 'jobWeight'>): Skill => ({ ...s, jobWeight: jobWeight(s.id, roles) })

//every skill from the content bank, with recall and fade from the person's own practice history
function baseSkills(): Omit<Skill, 'jobWeight'>[] {
  return SKILL_IDS.map(id => ({
    id, name: data.topics.find(t => t.id === id)?.name ?? id,
    recall: pRecall(id), daysUntilFade: pDaysUntilFade(id), halfLifeDays: Math.round(pHalf(id)),
  }))
}

//the three skills for today's session: highest priority among the topics the user kept
export function sessionSkillIds(roles: string[], ticked: (id: string) => boolean): string[] {
  return sortByPriority(baseSkills().filter(s => ticked(s.id)).map(withWeight(roles))).slice(0, 3).map(s => s.id)
}

export const api = {
  user: () => data.user,
  survey: (): Survey => data.user.survey,
  transcript: (): Transcript => data.transcript,
  topics: (): Topic[] => data.topics,
  plain: (id: string): string => data.topics.find(t => t.id === id)?.plain ?? '',
  skills: (roles: string[]): Skill[] => baseSkills().map(withWeight(roles)),
  skill: (id: string, roles: string[] = []): Skill | undefined => {
    const s = baseSkills().find(x => x.id === id)
    return s ? withWeight(roles)(s) : undefined
  },
  today: (): Today => data.today,
  questions: (): Question[] => data.questions,
  questionsFor: (skillIds: string[]): Question[] =>
    skillIds.map(id => data.questions.find(q => q.skillId === id)).filter((q): q is Question => Boolean(q)),
  verdicts: (): Verdicts => data.verdicts,
  scenario: (id: string): Scenario | undefined => data.scenarios.find(s => s.id === id),
  summary: (): Summary => data.summary,
  //demo rule until the live model: a right answer adds 15 points of recall, a miss takes 10 off
  changesFor: (skillIds: string[], rightById: Record<string, boolean>): SummaryChange[] => skillIds.map(id => {
    const mock = data.summary.changes.find(c => c.skillId === id)
    const before = data.skills.find(s => s.id === id)?.recall ?? 0
    const right = rightById[id] ?? false
    if (mock && mock.improved === right) return mock
    return right
      ? { skillId: id, before, after: Math.min(0.95, before + 0.15), next: 'Solid for now', improved: true }
      : { skillId: id, before, after: Math.max(0, before - 0.1), next: 'Again tomorrow', improved: false }
  }),
  skillDetail: (id: string): SkillDetail => ({ ...data.skillDetail, skillId: id }),
}

//sanity check that the declared demo states match the rules; runs once in development
export function checkRulesAgainstMock(): string[] {
  const problems: string[] = []
  for (const s of data.skills) {
    const declared = (s as Skill & { state?: SkillState }).state
    if (declared && declared !== skillState(s)) problems.push(`${s.id}: computed ${skillState(s)}, mock says ${declared}`)
  }
  return problems
}
