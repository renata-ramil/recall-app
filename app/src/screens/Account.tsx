import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Btn } from '../components/ui'
import { ErrorNote, LinkRow, Page, Sections, TextField } from '../components/Page'
import { changePassword, deleteAccount, exportData, logOut, passwordProblems, updateAccount } from '../auth/account'
import { useAuth } from '../auth/AuthContext'
import { useStore } from '../state/store'
import { fieldById } from '../content/fields'
import { clearEngineFor } from '../pilot/engine'
import { APP_PRIVACY, APP_TERMS, HELP, SECURITY, UPDATED } from '../legal/app-legal'

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '')
const when = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--cream-2-d)' }}>
      <span className="small muted">{label}</span><span className="small" style={{ textAlign: 'right' }}>{value}</span>
    </div>
  )
}

export function AccountScreen() {
  const nav = useNavigate()
  const { account, refresh } = useAuth()
  const { resetAll } = useStore()
  const [name, setName] = useState(account?.name ?? '')
  const [saved, setSaved] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')
  if (!account) return null

  function download() {
    const blob = new Blob([exportData(account!)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'recall-my-data.json'; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return (
    <Page title="Account" subtitle={`Member since ${day(account.createdAt)}`} back="/profile">
      <TextField id="name" label="First name" value={name} onChange={v => { setName(v); setSaved(false) }} />
      <Btn className="btn-soft" off={!name.trim() || name.trim() === account.name}
        onClick={() => { updateAccount(account.id, { name: name.trim() }); refresh(); setSaved(true) }}>{saved ? 'Saved' : 'Save name'}</Btn>
      <div>
        <Info label="Email" value={account.email} />
        <Info label="Field" value={fieldById(account.field)?.name ?? 'Not chosen'} />
        <Info label="Terms and privacy accepted" value={day(account.termsAcceptedAt)} />
        <Info label="Last log-in" value={account.lastLoginAt ? when(account.lastLoginAt) : ''} />
      </div>
      <LinkRow label="Change password" onClick={() => nav('/account/password')} />
      <LinkRow label="Download my data" detail="JSON file" onClick={download} />
      <Btn cream style={{ background: 'var(--cream-2)' }} onClick={() => { logOut(); refresh(); nav('/') }}>Log out</Btn>
      {!confirming
        ? <Btn cream style={{ background: 'var(--cream-2)' }} onClick={() => setConfirming(true)}>Delete account</Btn>
        : (
          <div style={{ background: 'var(--sand)', borderRadius: 24, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p className="small">This deletes your account, your setup and all practice history on this device. It cannot be undone. Type DELETE to confirm.</p>
            <div className="field" style={{ height: 48, display: 'flex', alignItems: 'center', background: 'var(--paper)' }}>
              <input aria-label="Type DELETE to confirm" className="body" style={{ width: '100%', cursor: 'text' }} value={typed} onChange={e => setTyped(e.target.value)} />
            </div>
            <Btn off={typed !== 'DELETE'} onClick={() => { clearEngineFor(account.id); deleteAccount(account.id); resetAll(); refresh(); nav('/') }}>Delete for good</Btn>
            <Btn className="btn-soft" onClick={() => { setConfirming(false); setTyped('') }}>Keep my account</Btn>
          </div>
        )}
    </Page>
  )
}

export function ChangePassword() {
  const nav = useNavigate()
  const { account } = useAuth()
  const [oldPw, setOld] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const problems = passwordProblems(pw)
  const ready = oldPw && !problems.length && pw === pw2 && pw !== oldPw
  if (!account) return null
  if (done) return <Page title="Password changed" back="/account" bottom={<Btn onClick={() => nav('/account')}>Back to account</Btn>}><p className="body">Use your new password next time you log in.</p></Page>
  return (
    <Page title="Change password" back="/account"
      bottom={<Btn off={!ready} onClick={async () => { try { await changePassword(account.id, oldPw, pw); setDone(true) } catch (e) { setError((e as Error).message) } }}>Change password</Btn>}>
      <TextField id="old" label="Current password" type="password" value={oldPw} onChange={setOld} autoComplete="current-password" />
      <TextField id="new" label="New password" type="password" value={pw} onChange={setPw} autoComplete="new-password"
        hint={pw && problems.length ? `Needs ${problems.join(', ')}.` : 'At least 8 characters with a letter and a number.'} />
      <TextField id="new2" label="Repeat new password" type="password" value={pw2} onChange={setPw2} autoComplete="new-password"
        hint={pw2 && pw !== pw2 ? 'The passwords do not match.' : pw && pw === oldPw ? 'Pick a password you have not used here.' : undefined} />
      <ErrorNote text={error} />
    </Page>
  )
}

export function SecurityScreen() {
  const nav = useNavigate()
  const { account, refresh } = useAuth()
  return (
    <Page title="Security and data" subtitle="How Recall protects your account.">
      <Sections sections={SECURITY} />
      {account && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2 className="body-b">Recent log-ins on this device</h2>
          {account.logins.map(t => <p key={t} className="small">{when(t)}</p>)}
        </section>
      )}
      <LinkRow label="Privacy policy" onClick={() => nav('/legal/privacy')} />
      <LinkRow label="Terms of use" onClick={() => nav('/legal/terms')} />
      {account && <Btn cream style={{ background: 'var(--cream-2)' }} onClick={() => { logOut(); refresh(); nav('/') }}>Log out of this device</Btn>}
    </Page>
  )
}

export const AppPrivacy = () => <Page title="Privacy policy" subtitle={UPDATED}><Sections sections={APP_PRIVACY} /></Page>
export const AppTerms = () => <Page title="Terms of use" subtitle={UPDATED}><Sections sections={APP_TERMS} /></Page>
export const HelpScreen = () => <Page title="Help" subtitle="Common questions."><Sections sections={HELP} /></Page>
