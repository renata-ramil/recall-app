import { useNavigate } from 'react-router-dom'
import { api, fadeLabel, skillState, sortByPriority, stateFill } from '../api'
import { useStore } from '../state/store'
import { Page } from '../components/Page'
import { dayNumber, pilot, streak } from '../pilot/engine'

const DAYS = 14

function Tile({ big, label, fill = 'var(--paper-2)', dark }: { big: string; label: string; fill?: string; dark?: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: fill, borderRadius: 24, padding: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span className={`num-l${dark ? ' on-dark' : ''}`}>{big}</span>
      <span className={`small${dark ? ' on-dark' : ''}`}>{label}</span>
    </div>
  )
}

//progress from the person's own practice history: sessions, answers, how well "I'm sure" matched reality, and each skill's last two weeks
export function ProgressScreen() {
  const nav = useNavigate()
  const { state } = useStore()
  const p = pilot()
  const all = Object.values(p.history).flat()
  const right = all.filter(a => a.right).length
  const sureOnes = all.filter(a => a.sure === 'sure')
  const notSure = all.filter(a => a.sure === 'notSure')
  const dontKnow = all.filter(a => a.dontKnow).length
  const today = dayNumber()
  const skills = sortByPriority(api.skills(state.survey.targetRoles).filter(s => state.topics[s.id]?.ticked ?? true))
  const days = Array.from({ length: DAYS }, (_, i) => today - (DAYS - 1 - i))

  return (
    <Page title="Your progress" subtitle={`Last ${DAYS} days`}>
      <div style={{ display: 'flex', gap: 8 }}>
        <Tile big={String(p.doneDays.length)} label={p.doneDays.length === 1 ? 'session done' : 'sessions done'} fill="var(--navy)" dark />
        <Tile big={String(streak())} label="day streak" fill="var(--sky)" />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Tile big={`${right}`} label={`right of ${all.length} answers`} fill="var(--mint)" />
        <Tile big={String(dontKnow)} label={`"I don't know"`} fill="var(--cream-2)" />
      </div>

      <section style={{ background: 'var(--paper-2)', borderRadius: 24, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 className="body-b">How well you know what you know</h2>
        {sureOnes.length + notSure.length === 0
          ? <p className="small muted">Answer a few questions and this shows how often your "I'm sure" was right.</p>
          : <>
              <p className="small">When you said <b>I'm sure</b>, you were right {sureOnes.filter(a => a.right).length} of {sureOnes.length} times.</p>
              <p className="small">When you said <b>Not sure</b>, you were right {notSure.filter(a => a.right).length} of {notSure.length} times.</p>
              <p className="cap muted">If "I'm sure" is often wrong on a skill, that skill is weaker than it feels.</p>
            </>}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 className="body-b">Each skill</h2>
        <div style={{ display: 'flex', gap: 12 }} className="cap muted" aria-hidden="true">
          <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--navy)', marginRight: 4 }} />right</span>
          <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--ochre)', marginRight: 4 }} />missed</span>
          <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--cream-2-d)', marginRight: 4 }} />no practice</span>
        </div>
        {skills.map(s => {
          const h = p.history[s.id] ?? []
          const st = skillState(s)
          return (
            <button key={s.id} type="button" onClick={() => nav(`/skills/${s.id}`)} className="ans ans-cream" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span className="small-b">{s.name}</span>
                <span className="cap" style={{ background: h.length ? stateFill(st) : 'var(--cream-2-d)', borderRadius: 999, padding: '2px 10px', whiteSpace: 'nowrap' }}>{h.length ? fadeLabel(s) : 'Not practiced yet'}</span>
              </div>
              <div style={{ display: 'flex', gap: 3 }} role="img" aria-label={`${h.length} practice answers in the last ${DAYS} days`}>
                {days.map(d => {
                  const on = h.filter(a => a.day === d)
                  const bg = !on.length ? 'var(--cream-2-d)' : on.every(a => a.right) ? 'var(--navy)' : 'var(--ochre)'
                  return <i key={d} style={{ flex: 1, height: 14, borderRadius: 4, background: bg }} />
                })}
              </div>
            </button>
          )
        })}
      </section>
    </Page>
  )
}
