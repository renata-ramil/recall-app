//the only module that knows where model values come from; swap the mock for a backend here
import raw from './mock-data.json'
import type { MockData, Skill, SkillState, Question, Scenario, SkillDetail, Summary, Today, Topic, Transcript, Survey, Verdicts } from './types'

const data = raw as unknown as MockData

export const FADE_THRESHOLD = data.fadeThreshold

export function skillState(s: Pick<Skill, 'recall' | 'daysUntilFade'>): SkillState {
  if (s.recall < FADE_THRESHOLD) return 'faded'
  if (s.daysUntilFade <= 3) return 'fadingSoon'
  return 'solid'
}

export function priority(s: Pick<Skill, 'recall' | 'jobWeight'>): number {
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

export function pct(r: number): string {
  return `${Math.round(r * 100)}%`
}

export const api = {
  user: () => data.user,
  survey: (): Survey => data.user.survey,
  transcript: (): Transcript => data.transcript,
  topics: (): Topic[] => data.topics,
  skills: (): Skill[] => data.skills,
  skill: (id: string): Skill | undefined => data.skills.find(s => s.id === id),
  today: (): Today => data.today,
  questions: (): Question[] => data.questions,
  questionsForSession: (): Question[] =>
    data.today.session.skillIds.map(id => data.questions.find(q => q.skillId === id)).filter((q): q is Question => Boolean(q)),
  verdicts: (): Verdicts => data.verdicts,
  scenario: (id: string): Scenario | undefined => data.scenarios.find(s => s.id === id),
  summary: (): Summary => data.summary,
  skillDetail: (id: string): SkillDetail => ({ ...data.skillDetail, skillId: id }),
}

//sanity check that the rules reproduce the mock order and states; runs once in development
export function checkRulesAgainstMock(): string[] {
  const problems: string[] = []
  const sorted = sortByPriority(data.skills)
  if (sorted.map(s => s.id).join() !== data.skills.map(s => s.id).join()) problems.push('priority sort differs from mock order')
  for (const s of data.skills) {
    const declared = (s as Skill & { state?: SkillState }).state
    if (declared && declared !== skillState(s)) problems.push(`${s.id}: computed ${skillState(s)}, mock says ${declared}`)
  }
  return problems
}
