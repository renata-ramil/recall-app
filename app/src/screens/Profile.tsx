import { useNavigate } from 'react-router-dom'
import { api, FOCUS_OPTIONS } from '../api'
import { useStore } from '../state/store'
import { Btn, Nav, Opt } from '../components/ui'
import { PILOT } from '../pilot/config'
import { pilot, resetPilot } from '../pilot/engine'
import { logEvent } from '../pilot/log'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LinkRow } from '../components/Page'
import { fieldById } from '../content/fields'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="small-b">{label}</div>
      {children}
    </div>
  )
}

export function Profile() {
  const nav = useNavigate()
  const { state, set, resetAll } = useStore()
  const s = state.survey
  const opts = api.survey()
  const { account } = useAuth()
  const up = (patch: Partial<typeof s>) => set({ survey: { ...s, ...patch } })
  return (
    <div className="screen">
      <div className="safe-top" style={{ padding: '48px 24px 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 className="h1">Profile</h1>
        <p className="small muted">{PILOT ? `Study code ${pilot().code}` : `${account?.name ?? ''}${account?.field ? ` · ${fieldById(account.field)?.name}` : ''}`}, finished {s.finishedMonth} {s.finishedYear}</p>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: '16px 24px 0 24px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
        <Row label="Target roles">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {/* editable later; at least one role stays selected */}
            {opts.targetRoleOptions.map(o => <Opt key={o} selected={s.targetRoles.includes(o)} style={{ padding: '0 16px' }}
              onClick={() => { const next = s.targetRoles.includes(o) ? s.targetRoles.filter(r => r !== o) : [...s.targetRoles, o]; if (next.length) up({ targetRoles: next }) }}>{o}</Opt>)}
          </div>
        </Row>
        <Row label="Main goal">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {opts.mainGoalOptions.map(o => <Opt key={o} selected={s.mainGoal === o} onClick={() => up({ mainGoal: o })}>{o}</Opt>)}
          </div>
        </Row>
        {!PILOT && (
          <Row label="What matters most">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              {FOCUS_OPTIONS.map(o => <Opt key={o} selected={(s.focus ?? 'Both equally') === o} onClick={() => up({ focus: o })}>{o}</Opt>)}
            </div>
          </Row>
        )}
        <Row label="Time per day">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {opts.timePerDayOptions.map(o => <Opt key={o} selected={s.timePerDay === o} onClick={() => up({ timePerDay: o })}>{o}</Opt>)}
          </div>
        </Row>
        <Row label="Reminder time">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
            {opts.reminderTimeOptions.map(o => <Opt key={o} selected={s.reminderTime === o && !state.remindersPaused} onClick={() => { up({ reminderTime: o }); set({ remindersPaused: false }); if (PILOT) logEvent('reminder', { time: o, paused: 0 }) }}>{o}</Opt>)}
          </div>
        </Row>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <Btn cream style={{ background: 'var(--cream-2)' }} onClick={() => { set({ remindersPaused: !state.remindersPaused }); if (PILOT) logEvent('reminder', { time: s.reminderTime ?? '', paused: state.remindersPaused ? 0 : 1 }) }}>{state.remindersPaused ? 'Resume reminders' : 'Pause reminders'}</Btn>
          <Btn cream style={{ background: 'var(--cream-2)' }} onClick={() => { if (PILOT) logEvent('delete_request'); resetPilot(); resetAll(); nav('/') }}>Delete my data</Btn>
          <LinkRow label="Send feedback" onClick={() => nav('/feedback?from=/profile')} />
          {PILOT && <p className="small muted" style={{ textAlign: 'center' }}><Link to="/privacy">Privacy notice</Link> · <Link to="/terms">Terms of use</Link></p>}
          {!PILOT && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4, paddingBottom: 8 }}>
              <LinkRow label="Progress" onClick={() => nav('/progress')} />
              <LinkRow label="Account" detail={account?.email} onClick={() => nav('/account')} />
              <LinkRow label="Fields" detail={fieldById(account?.field)?.name} onClick={() => nav('/fields')} />
              <LinkRow label="Security and data" onClick={() => nav('/security')} />
              <LinkRow label="Help" onClick={() => nav('/help')} />
              <p className="small muted" style={{ textAlign: 'center' }}><Link to="/legal/privacy">Privacy policy</Link> · <Link to="/legal/terms">Terms of use</Link></p>
            </div>
          )}
        </div>
      </div>
      <div className="safe-bottom" style={{ padding: '16px 24px 24px 24px' }}>
        <Nav active="profile" onGo={t => nav(`/${t}`)} />
      </div>
    </div>
  )
}
