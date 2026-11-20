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
import { PILOT } from './pilot/config'
import { pilot } from './pilot/engine'
import { flush } from './pilot/log'
import { Consent, PrivacyScreen, TermsScreen } from './pilot/Consent'

if (PILOT) void flush()

//pilot entry: the consent screen first, then setup, then Today
function PilotHome() {
  const { state } = useStore()
  if (!pilot().consentAt) return <Consent />
  return <Navigate to={state.onboarded ? '/today' : '/setup/survey'} replace />
}

if (import.meta.env.DEV) {
  const problems = checkRulesAgainstMock()
  if (problems.length) console.warn('model rules differ from mock:', problems)
}

function Guard({ children }: { children: React.ReactNode }) {
  const { state } = useStore()
  const loc = useLocation()
  if (PILOT && !pilot().consentAt && loc.pathname !== '/') return <Navigate to="/" replace />
  if (!state.onboarded && !loc.pathname.startsWith('/setup') && loc.pathname !== '/') return <Navigate to="/" replace />
  return <>{children}</>
}

function App() {
  const fixed = new URLSearchParams(window.location.search).has('frame')
  return (
    <div className={`app${fixed ? ' fixed-frame' : ''}`}>
      <Routes>
        <Route path="/" element={PILOT ? <PilotHome /> : <Welcome />} />
        <Route path="/privacy" element={<PrivacyScreen />} />
        <Route path="/terms" element={<TermsScreen />} />
        <Route path="/setup/survey" element={<Guard><SetupSurvey /></Guard>} />
        <Route path="/setup/record" element={<Guard><CourseRecord /></Guard>} />
        <Route path="/setup/topics" element={<Guard><TopicPicker /></Guard>} />
        <Route path="/setup/plan" element={<Guard><YourPlan /></Guard>} />
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
