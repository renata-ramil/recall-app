import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { StoreProvider, useStore } from './state/store'
import { checkRulesAgainstMock } from './api'
import { Welcome, SetupSurvey, CourseRecord, TopicPicker, YourPlan } from './screens/Onboarding'
import { Today } from './screens/Today'
import { Question, ScenarioScreen, SummaryScreen, SkillsTab } from './screens/Session'
import { SkillDetailScreen } from './screens/SkillDetail'
import { Profile } from './screens/Profile'
import './styles/recall.css'

if (import.meta.env.DEV) {
  const problems = checkRulesAgainstMock()
  if (problems.length) console.warn('model rules differ from mock:', problems)
}

function Guard({ children }: { children: React.ReactNode }) {
  const { state } = useStore()
  const loc = useLocation()
  if (!state.onboarded && !loc.pathname.startsWith('/setup') && loc.pathname !== '/') return <Navigate to="/" replace />
  return <>{children}</>
}

function App() {
  const fixed = new URLSearchParams(window.location.search).has('frame')
  return (
    <div className={`app${fixed ? ' fixed-frame' : ''}`}>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/setup/survey" element={<SetupSurvey />} />
        <Route path="/setup/record" element={<CourseRecord />} />
        <Route path="/setup/topics" element={<TopicPicker />} />
        <Route path="/setup/plan" element={<YourPlan />} />
        <Route path="/today" element={<Guard><Today /></Guard>} />
        <Route path="/session/question" element={<Guard><Question /></Guard>} />
        <Route path="/session/scenario" element={<Guard><ScenarioScreen /></Guard>} />
        <Route path="/session/summary" element={<Guard><SummaryScreen /></Guard>} />
        <Route path="/skills" element={<Guard><SkillsTab /></Guard>} />
        <Route path="/skills/:id" element={<Guard><SkillDetailScreen /></Guard>} />
        <Route path="/profile" element={<Guard><Profile /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}><App /></BrowserRouter>
    </StoreProvider>
  </StrictMode>,
)
