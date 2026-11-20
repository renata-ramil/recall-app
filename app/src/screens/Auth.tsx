import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Btn } from '../components/ui'
import { ErrorNote, Page, TextField } from '../components/Page'
import { logIn, passwordProblems, signUp, validEmail } from '../auth/account'
import { useAuth } from '../auth/AuthContext'
import { useStore } from '../state/store'

export function SignUp() {
  const nav = useNavigate()
  const { refresh } = useAuth()
  const { resetAll } = useStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [adult, setAdult] = useState(false)
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const problems = passwordProblems(pw)
  const ready = name.trim() && validEmail(email) && !problems.length && pw === pw2 && adult && agree && !busy

  async function submit() {
    if (!ready) return
    setBusy(true); setError(null)
    try {
      await signUp(name, email, pw)
      resetAll(); refresh(); nav('/setup/field')
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Page title="Create your account" subtitle="Free while Recall is a prototype." back="/"
      bottom={<Btn off={!ready} onClick={submit}>{busy ? 'Creating account' : 'Create account'}</Btn>}>
      <TextField id="name" label="First name" value={name} onChange={setName} autoComplete="given-name" />
      <TextField id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email"
        hint={email && !validEmail(email) ? 'Enter a full email address.' : undefined} />
      <TextField id="pw" label="Password" type="password" value={pw} onChange={setPw} autoComplete="new-password"
        hint={pw && problems.length ? `Needs ${problems.join(', ')}.` : 'At least 8 characters with a letter and a number.'} />
      <TextField id="pw2" label="Repeat password" type="password" value={pw2} onChange={setPw2} autoComplete="new-password"
        hint={pw2 && pw !== pw2 ? 'The passwords do not match.' : undefined} />
      <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }} className="small">
        <input type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)} style={{ width: 24, height: 24, flexShrink: 0 }} />
        <span>I am 18 or older.</span>
      </label>
      <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }} className="small">
        <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ width: 24, height: 24, flexShrink: 0 }} />
        <span>I accept the <Link to="/legal/terms">terms of use</Link> and the <Link to="/legal/privacy">privacy policy</Link>.</span>
      </label>
      <ErrorNote text={error} />
      <p className="small muted">Already have an account? <Link to="/login">Log in</Link></p>
    </Page>
  )
}

export function LogIn() {
  const nav = useNavigate()
  const { refresh } = useAuth()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ready = validEmail(email) && pw.length > 0 && !busy

  async function submit() {
    if (!ready) return
    setBusy(true); setError(null)
    try {
      await logIn(email, pw)
      //home sends the person on with their own saved state, which loads once the account is set
      refresh(); nav('/')
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Page title="Log in" back="/" bottom={<Btn off={!ready} onClick={submit}>{busy ? 'Logging in' : 'Log in'}</Btn>}>
      <TextField id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <TextField id="pw" label="Password" type="password" value={pw} onChange={setPw} autoComplete="current-password" />
      <ErrorNote text={error} />
      <p className="small muted">New to Recall? <Link to="/signup">Create an account</Link></p>
      <p className="small muted"><Link to="/help">Forgot your password?</Link></p>
    </Page>
  )
}
