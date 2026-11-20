import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setFocus } from '../api'
import { PILOT } from '../pilot/config'
import { appKey, currentAccount } from '../auth/account'

export type Sure = 'sure' | 'notSure' | 'dontKnow'
export interface AnswerRecord { questionId: string; optionId: string; sure: Sure; right: boolean }

export interface SessionState {
  startedAt: number | null
  questionIndex: number
  phase: 'ask' | 'feedback'
  sure: Sure | null
  picked: string | null
  answers: AnswerRecord[]
  scenarioStep: number
  scenarioChoices: Record<number, string>
  scenarioText: string
  scenarioSubmitted: boolean
  ratings: Record<number, string>
  finishedAt: number | null
  completedOn: string | null
  useThisWeek: string | null
  //pilot: the session's skills, frozen at start
  planIds?: string[]
  planCheckin?: boolean
  planScenarioId?: string | null
  changes?: Record<string, { before: number; after: number }>
}

export interface SurveyAnswers {
  targetRoles: string[]
  finishedMonth: string | null
  finishedYear: number | null
  mainGoal: string | null
  skillsToKeep: string
  timePerDay: string | null
  reminderTime: string | null
  focus?: string | null
}

export interface AppState {
  survey: SurveyAnswers
  transcript: 'before' | 'processing' | 'done' | 'typed'
  //grades are optional: course names alone are enough
  includeGrades: boolean
  typedCourses: string
  topics: Record<string, { ticked: boolean; confidence: number | null }>
  onboarded: boolean
  remindersPaused: boolean
  session: SessionState
}

//v2: several target roles and optional grades; a new key so old saved setups start fresh
const storeKey = () => (PILOT ? 'recall.pilot.app' : appKey(currentAccount()?.id))

const emptySession: SessionState = {
  startedAt: null, questionIndex: 0, phase: 'ask', sure: null, picked: null, answers: [],
  scenarioStep: 0, scenarioChoices: {}, scenarioText: '', scenarioSubmitted: false, ratings: {},
  finishedAt: null, completedOn: null, useThisWeek: null,
}

//the mock answers prefill the survey and topics so the designed states render on first load
function initial(): AppState {
  if (PILOT) {
    //pilot: nothing prefilled, every answer is the participant's own
    const topics: AppState['topics'] = {}
    for (const t of api.topics()) topics[t.id] = { ticked: false, confidence: null }
    return {
      survey: { targetRoles: [], finishedMonth: null, finishedYear: null, mainGoal: null, skillsToKeep: '', timePerDay: null, reminderTime: null },
      transcript: 'before', includeGrades: false, typedCourses: '', topics, onboarded: false, remindersPaused: false, session: emptySession,
    }
  }
  const s = api.survey()
  const topics: AppState['topics'] = {}
  for (const t of api.topics()) topics[t.id] = { ticked: t.ticked, confidence: t.confidence }
  return {
    survey: {
      targetRoles: s.targetRoles, finishedMonth: s.finishedMonth, finishedYear: s.finishedYear, mainGoal: s.mainGoal,
      skillsToKeep: s.skillsToKeep, timePerDay: s.timePerDay, reminderTime: s.reminderTime,
    },
    transcript: 'before', includeGrades: false, typedCourses: '', topics, onboarded: false, remindersPaused: false, session: emptySession,
  }
}

//a fresh setup with the default answers, used for the demo account
export const freshState = (): AppState => initial()

function load(): AppState {
  try {
    const raw = localStorage.getItem(storeKey())
    if (raw) return { ...initial(), ...JSON.parse(raw) }
  } catch { /* storage unavailable: start fresh */ }
  return initial()
}

interface Store {
  state: AppState
  set: (patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void
  setSession: (patch: Partial<SessionState> | ((s: SessionState) => Partial<SessionState>)) => void
  resetSession: () => void
  resetAll: () => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load)
  //priority reads the person's focus, so it is set before any screen sorts skills
  if (!PILOT) setFocus(state.survey.focus)
  useEffect(() => {
    try { localStorage.setItem(storeKey(), JSON.stringify(state)) } catch { /* ignore */ }
  }, [state])
  const store = useMemo<Store>(() => ({
    state,
    set: patch => setState(s => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) })),
    setSession: patch => setState(s => ({ ...s, session: { ...s.session, ...(typeof patch === 'function' ? patch(s.session) : patch) } })),
    resetSession: () => setState(s => ({ ...s, session: { ...emptySession } })),
    resetAll: () => { try { localStorage.removeItem(storeKey()) } catch { /* ignore */ } setState(initial()) },
  }), [state])
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}
