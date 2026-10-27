import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useStore } from '../state/store'
import { Btn, Nav, Opt } from '../components/ui'

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
  const user = api.user()
  const up = (patch: Partial<typeof s>) => set({ survey: { ...s, ...patch } })
  return (
    <div className="screen">
      <div className="safe-top" style={{ padding: '48px 24px 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 className="h1">Profile</h1>
        <p className="small muted">{user.firstName}, finished {s.finishedMonth} {s.finishedYear}</p>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: '16px 24px 0 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Row label="Target role">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {opts.targetRoleOptions.map(o => <Opt key={o} selected={s.targetRole === o} style={{ padding: '0 16px' }} onClick={() => up({ targetRole: o })}>{o}</Opt>)}
          </div>
        </Row>
        <Row label="Main goal">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {opts.mainGoalOptions.map(o => <Opt key={o} selected={s.mainGoal === o} onClick={() => up({ mainGoal: o })}>{o}</Opt>)}
          </div>
        </Row>
        <Row label="Time per day">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {opts.timePerDayOptions.map(o => <Opt key={o} selected={s.timePerDay === o} onClick={() => up({ timePerDay: o })}>{o}</Opt>)}
          </div>
        </Row>
        <Row label="Reminder time">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
            {opts.reminderTimeOptions.map(o => <Opt key={o} selected={s.reminderTime === o && !state.remindersPaused} onClick={() => { up({ reminderTime: o }); set({ remindersPaused: false }) }}>{o}</Opt>)}
          </div>
        </Row>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <Btn cream style={{ background: 'var(--cream-2)' }} onClick={() => set({ remindersPaused: !state.remindersPaused })}>{state.remindersPaused ? 'Resume reminders' : 'Pause reminders'}</Btn>
          <Btn cream style={{ background: 'var(--cream-2)' }} onClick={() => { resetAll(); nav('/') }}>Delete my data</Btn>
        </div>
      </div>
      <div className="safe-bottom" style={{ padding: '16px 24px 24px 24px' }}>
        <Nav active="profile" onGo={t => nav(`/${t}`)} />
      </div>
    </div>
  )
}
