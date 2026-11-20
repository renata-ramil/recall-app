//which skills a course covers, read from its title, so grades can count per skill instead of one mean grade
import { api } from '../api'
import type { AppState } from '../state/store'

const RULES: Array<[RegExp, string[]]> = [
  [/statistic|biostat/i, ['probability', 'inference', 'exploring']],
  [/probabilit|stochastic/i, ['probability']],
  [/inference|hypothesis|experiment/i, ['inference', 'causal']],
  [/regression|modell?ing|econometric/i, ['regression', 'inference']],
  [/causal|policy evaluation|program evaluation/i, ['causal']],
  [/machine learning|\bml\b|artificial intelligence|\bai\b|deep learning|data mining/i, ['ml', 'regression']],
  [/bayes/i, ['bayesian', 'probability']],
  [/python|programming|\bsql\b|database|computer science|coding/i, ['pythonsql']],
  [/data analy|data science|analytics/i, ['cleaning', 'exploring', 'pythonsql']],
  [/visuali[sz]|dashboard|tableau/i, ['exploring', 'communicating']],
  [/cleaning|wrangling|data management/i, ['cleaning']],
  [/communicat|writing|presentation|storytelling/i, ['communicating']],
]

export function courseSkills(title: string): string[] {
  const out = new Set<string>()
  for (const [re, ids] of RULES) if (re.test(title)) ids.forEach(i => out.add(i))
  return [...out]
}

export interface CourseLine { name: string; grade: number | null; skills: string[] }

//the courses this person gave: the transcript (with grades only when they chose to share them) or typed titles
export function courseLines(state: AppState): CourseLine[] {
  if (state.transcript === 'done') return api.transcript().courses.map(c => ({ name: c.name, grade: state.includeGrades ? c.grade : null, skills: courseSkills(c.name) }))
  return state.typedCourses.split('\n').map(l => l.trim()).filter(Boolean).map(name => ({ name, grade: null, skills: courseSkills(name) }))
}

//mean grade of the courses that cover each skill; skills with no graded course are left out
export function topicGrades(state: AppState): Record<string, number> {
  const sums: Record<string, [number, number]> = {}
  for (const c of courseLines(state)) {
    if (c.grade === null) continue
    for (const s of c.skills) { const [a, n] = sums[s] ?? [0, 0]; sums[s] = [a + c.grade, n + 1] }
  }
  return Object.fromEntries(Object.entries(sums).map(([s, [a, n]]) => [s, Math.round((a / n) * 10) / 10]))
}

//the courses behind one skill, for the topic picker
export function coursesFor(state: AppState, skillId: string): CourseLine[] {
  return courseLines(state).filter(c => c.skills.includes(skillId))
}
