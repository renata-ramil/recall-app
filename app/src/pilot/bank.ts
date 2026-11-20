//turns the content bank (content/module_ds_v1.json, 40 items and 3 scenarios) into the app's question and scenario shapes
import raw from './bank.json'
import mock from '../api/mock-data.json'
import type { Question, Scenario } from '../api/types'

interface BankItem {
  id: string; topic: string; format: string; level: number; difficulty: number; stem: string; code: string | null
  options: Record<string, string>; key: string; explanation: string; misconceptions?: Record<string, string>
}
interface BankStep { kind: string; prompt: string; options?: Record<string, string>; key?: string; model_answer?: string; checkpoints?: string[] }
interface BankScenario { id: string; topic: string; title: string; context: string; steps: BankStep[] }
const bank = raw as unknown as { topics: Record<string, string>; recall_items: BankItem[]; scenarios: BankScenario[] }

//content bank topic codes to the app's skill ids
export const TOPIC_TO_SKILL: Record<string, string> = {
  T01: 'cleaning', T02: 'exploring', T03: 'probability', T04: 'inference', T05: 'regression',
  T06: 'causal', T07: 'ml', T08: 'bayesian', T09: 'pythonsql', T10: 'communicating',
}
export const SKILL_IDS = Object.values(TOPIC_TO_SKILL)

export interface PilotQuestion extends Question { difficulty: number; level: number; format: string; code: string | null }

const NEUTRAL_NEXT = 'Saved. It comes back on your schedule.'

function toQuestion(it: BankItem): PilotQuestion {
  return {
    id: it.id, skillId: TOPIC_TO_SKILL[it.topic], prompt: it.stem, code: it.code,
    options: Object.entries(it.options).map(([id, text]) => ({ id, text, misconception: it.misconceptions?.[id] })),
    correctId: it.key, explanation: it.explanation, nextReviewIfRight: NEUTRAL_NEXT, nextReviewIfWrong: NEUTRAL_NEXT,
    difficulty: it.difficulty, level: it.level, format: it.format,
  }
}

const bySkill: Record<string, PilotQuestion[]> = {}
for (const it of bank.recall_items) {
  const q = toQuestion(it)
  ;(bySkill[q.skillId] ??= []).push(q)
}
//easier items first, so the first practice of a skill starts at level 1
for (const k of Object.keys(bySkill)) bySkill[k].sort((a, b) => a.level - b.level || a.id.localeCompare(b.id))

export function itemsFor(skillId: string): PilotQuestion[] {
  return bySkill[skillId] ?? []
}
export function itemById(id: string): PilotQuestion | undefined {
  return Object.values(bySkill).flat().find(q => q.id === id)
}

function toScenario(s: BankScenario): Scenario {
  //S01 is the scenario already designed into the app, with its figure strip
  const designed = (mock as unknown as { scenarios: Scenario[] }).scenarios.find(x => x.title.startsWith('Ship the checkout'))
  if (s.id === 'S01' && designed) return { ...designed, id: s.id }
  return {
    id: s.id, title: s.title, context: s.context, figures: [],
    steps: s.steps.map(st => st.kind === 'justify'
      ? { type: 'explain' as const, prompt: st.prompt, sampleUserAnswer: '', modelAnswer: st.model_answer ?? '',
          checkpoints: (st.checkpoints ?? []).map(text => ({ text, sampleRating: '' })), ratingOptions: ['Matched', 'Partly', 'Missed'] }
      : { type: 'choice' as const, prompt: st.prompt, correctId: st.key ?? '',
          options: Object.entries(st.options ?? {}).map(([id, text]) => ({ id, text })) }),
  }
}
export const SCENARIOS: Scenario[] = bank.scenarios.map(toScenario)
