//the demo account: one click logs a visitor into a ready account with a week of practice, so nobody has to sign up to look around
import { accounts, appKey, deleteAccount, logIn, signUp, updateAccount } from './account'
import { freshState } from '../state/store'
import { assignGroups, clearEngineFor, engineFor, seedDemoHistory, setProfile } from '../pilot/engine'

export const DEMO = { name: 'Alex', email: 'demo@recall.app', password: 'demo2026' }
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

async function create() {
  const acc = await signUp(DEMO.name, DEMO.email, DEMO.password)
  updateAccount(acc.id, { field: 'data-science' })
  const st = { ...freshState(), onboarded: true }
  try { localStorage.setItem(appKey(acc.id), JSON.stringify(st)) } catch { /* storage unavailable */ }
  const ticked = Object.entries(st.topics).filter(([, t]) => t.ticked)
  const confidence = Object.fromEntries(ticked.map(([id, t]) => [id, t.confidence ?? 3]))
  const m = MONTHS.indexOf(st.survey.finishedMonth ?? '')
  const finished = st.survey.finishedYear && m >= 0 ? `${st.survey.finishedYear}-${String(m + 1).padStart(2, '0')}-15` : null
  engineFor(acc.id)
  setProfile(confidence, finished, {})
  assignGroups(ticked.map(([id]) => id), confidence, finished)
  seedDemoHistory(ticked.map(([id]) => id))
}

export async function startDemo() {
  const existing = accounts().find(a => a.email === DEMO.email)
  if (!existing) return create()
  try { await logIn(DEMO.email, DEMO.password) } catch {
    //someone changed the demo password on this device: start the demo over
    clearEngineFor(existing.id); deleteAccount(existing.id); await create()
  }
}
