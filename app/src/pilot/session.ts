//glue between the app screens and the pilot engine: today's skills, questions and scenario
import { api, priority, sortByPriority } from '../api'
import type { AppState } from '../state/store'
import type { Question, Scenario } from '../api/types'
import { PILOT } from './config'
import { SCENARIOS } from './bank'
import { COMMON_REVIEW_DAY } from './config'
import { itemFor, pilotDay, todaysPlan } from './engine'

export interface SessionPlan { skillIds: string[]; questions: Question[]; scenario: Scenario | undefined; checkin: boolean }

export function sessionPlan(state: AppState): SessionPlan {
  const roles = state.survey.targetRoles
  const tickedIds = Object.entries(state.topics).filter(([, t]) => t.ticked).map(([id]) => id)
  if (!PILOT) {
    const top = sortByPriority(api.skills(roles).filter(s => state.topics[s.id]?.ticked ?? true)).slice(0, 3).map(s => s.id)
    return { skillIds: top, questions: api.questionsFor(top), scenario: api.scenario(api.today().session.scenarioId), checkin: false }
  }
  const pr = (id: string) => { const s = api.skill(id, roles); return s ? priority(s) : 0 }
  const plan = todaysPlan(tickedIds, pr)
  const questions = plan.skillIds.map(id => itemFor(id, plan.checkin)).filter((q): q is NonNullable<typeof q> => Boolean(q))
  //a scenario every other day, rotating through the three in the content bank; none on check-in days or the common review day
  const day = pilotDay()
  const scenario = !plan.checkin && day !== COMMON_REVIEW_DAY && day % 2 === 1 ? SCENARIOS[Math.floor((day - 1) / 2) % SCENARIOS.length] : undefined
  return { skillIds: plan.skillIds, questions, scenario, checkin: plan.checkin }
}

//the plan is frozen when a session starts, so answering never reorders the questions mid-session
export function frozenPlan(state: AppState): SessionPlan {
  const s = state.session
  if (!PILOT || !s.planIds) return sessionPlan(state)
  const questions = s.planIds.map(id => itemFor(id, Boolean(s.planCheckin))).filter((q): q is NonNullable<typeof q> => Boolean(q))
  const scenario = s.planScenarioId ? SCENARIOS.find(x => x.id === s.planScenarioId) : undefined
  return { skillIds: s.planIds, questions, scenario, checkin: Boolean(s.planCheckin) }
}
