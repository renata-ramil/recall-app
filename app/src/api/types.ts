export type SkillState = 'faded' | 'fadingSoon' | 'solid'

export interface Survey {
  targetRole: string
  targetRoleOptions: string[]
  finishedMonth: string
  finishedYear: number
  mainGoal: string
  mainGoalOptions: string[]
  skillsToKeep: string
  timePerDay: string
  timePerDayOptions: string[]
  reminderTime: string
  reminderTimeOptions: string[]
}

export interface Course { name: string; grade: number; matches: boolean }
export interface Transcript {
  fileDeleted: boolean
  courses: Course[]
  summary: { read: number; matching: number; averageGrade: number; gradeScaleMax: number }
}

export interface Topic { id: string; name: string; ticked: boolean; confidence: number | null }

//values the forgetting model supplies per skill; the UI never computes recall or half-life itself
export interface Skill {
  id: string
  name: string
  recall: number
  jobWeight: number
  daysUntilFade: number
  halfLifeDays?: number
}

export interface Option { id: string; text: string; misconception?: string }
export interface Question {
  id: string
  skillId: string
  prompt: string
  options: Option[]
  correctId: string
  explanation: string
  nextReviewIfRight: string
  nextReviewIfWrong: string
}

export interface Verdicts { rightSure: string; rightNotSure: string; wrongSure: string; wrongNotSure: string; dontKnow: string }

export interface ChoiceStep { type: 'choice'; prompt: string; options: { id: string; text: string }[]; correctId: string }
export interface ExplainStep {
  type: 'explain'
  prompt: string
  sampleUserAnswer: string
  modelAnswer: string
  checkpoints: { text: string; sampleRating: string }[]
  ratingOptions: string[]
}
export type ScenarioStep = ChoiceStep | ExplainStep
export interface Scenario {
  id: string
  title: string
  context: string
  figures: { value: string; label: string }[]
  steps: ScenarioStep[]
}

export interface SummaryChange { skillId: string; before: number; after: number; next: string; improved: boolean }
export interface Summary {
  recalled: number
  recallTotal: number
  scenarioPoints: number
  scenarioTotal: number
  duration: string
  changes: SummaryChange[]
  useThisWeekOptions: string[]
}

export interface CurveSegment { fromDay: number; toDay: number; start: number; halfLife: number }
export interface SkillDetail {
  skillId: string
  recallToday: number
  halfLifeDays: number
  jobWeight: number
  jobWeightNote: string
  nextPractice: string
  curve: { axisDays: number; todayDay: number; segments: CurveSegment[]; practiceDays: number[]; projectionFromDay: number }
  recentAnswers: { topic: string; correct: boolean; daysAgo: number }[]
}

export interface Today {
  session: { skillIds: string[]; scenarioId: string; estimatedMinutes: number }
  streakDays: number
  week: { letter: string; date: number; status: 'done' | 'today' | 'future' }[]
}

export interface MockData {
  user: { firstName: string; survey: Survey }
  transcript: Transcript
  topics: Topic[]
  fadeThreshold: number
  skills: Skill[]
  today: Today
  questions: Question[]
  verdicts: Verdicts
  scenarios: Scenario[]
  summary: Summary
  skillDetail: SkillDetail
}
