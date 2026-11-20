import { StrictMode, useMemo } from 'react'
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
import { engineFor, pilot } from './pilot/engine'
import { flush } from './pilot/log'
import { Consent, PrivacyScreen, TermsScreen } from './pilot/Consent'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { FeedbackScreen } from './screens/Feedback'
import { ProgressScreen } from './screens/Progress'
import { LogIn, SignUp } from './screens/Auth'
import { FieldPicker, FieldPreview, FieldsScreen } from './screens/Fields'
import { AccountScreen, AppPrivacy, AppTerms, ChangePassword, HelpScreen, SecurityScreen } from './screens/Account'

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

//main app entry: the welcome screen for visitors, the app for someone logged in
function Home() {
  const { account } = useAuth()
  const { state } = useStore()
  if (!account) return <Welcome />
  return <Navigate to={state.onboarded ? '/today' : account.field ? '/setup/survey' : '/setup/field'} replace />
}

function Guard({ children }: { children: React.ReactNode }) {
  const { state } = useStore()
  const { account } = useAuth()
  const loc = useLocation()
  if (!PILOT && !account) return <Navigate to="/" replace />
  if (!PILOT && ['/setup/field', '/fields', '/account', '/account/password', '/security'].includes(loc.pathname)) return <>{children}</>
  if (PILOT && !pilot().consentAt && loc.pathname !== '/') return <Navigate to="/" replace />
  if (!state.onboarded && !loc.pathname.startsWith('/setup') && loc.pathname !== '/') return <Navigate to="/" replace />
  return <>{children}</>
}

function App() {
  const fixed = new URLSearchParams(window.location.search).has('frame')
  return (
    <div className={`app${fixed ? ' fixed-frame' : ''}`}>
      <Routes>
        <Route path="/" element={PILOT ? <PilotHome /> : <Home />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<LogIn />} />
        <Route path="/legal/privacy" element={<AppPrivacy />} />
        <Route path="/legal/terms" element={<AppTerms />} />
        <Route path="/help" element={<HelpScreen />} />
        <Route path="/feedback" element={<FeedbackScreen />} />
        <Route path="/fields/:id" element={<FieldPreview />} />
        <Route path="/setup/field" element={<Guard><FieldPicker /></Guard>} />
        <Route path="/fields" element={<Guard><FieldsScreen /></Guard>} />
        <Route path="/account" element={<Guard><AccountScreen /></Guard>} />
        <Route path="/account/password" element={<Guard><ChangePassword /></Guard>} />
        <Route path="/security" element={<Guard><SecurityScreen /></Guard>} />
        <Route path="/progress" element={<Guard><ProgressScreen /></Guard>} />
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

//the app state is per account, so it reloads when someone logs in or out
function Root() {
  const { account } = useAuth()
  //point the engine at this account's history before any screen reads it
  useMemo(() => engineFor(account?.id ?? null), [account?.id])
  return (
    <StoreProvider key={account?.id ?? 'none'}>
      <BrowserRouter basename={import.meta.env.BASE_URL}><App /></BrowserRouter>
    </StoreProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>,
)
