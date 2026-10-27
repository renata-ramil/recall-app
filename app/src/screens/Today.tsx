import { useNavigate } from 'react-router-dom'
import { api, FADE_THRESHOLD, pct, sortByPriority, skillState } from '../api'
import { todayKey, useStore } from '../state/store'
import { Btn, Nav } from '../components/ui'

function greeting(d = new Date(Date.now())): string {
  const h = d.getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

//the week strip follows the real calendar: Monday to Sunday of the current week, days before today count as done
function currentWeek(now = new Date(Date.now())) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    const offset = i - ((now.getDay() + 6) % 7)
    return { date: String(d.getDate()), letter: 'MTWTFSS'[i], status: offset < 0 ? 'done' : offset === 0 ? 'today' : 'future' }
  })
}

export function Today() {
  const nav = useNavigate()
  const { state, resetSession, setSession } = useStore()
  const user = api.user()
  const today = api.today()
  const skills = sortByPriority(api.skills().filter(s => state.topics[s.id]?.ticked ?? true))
  const sessionSkills = skills.slice(0, 3)
  const scenario = api.scenario(today.session.scenarioId)
  //fade banner target: the next skill still above the threshold; one sitting at 60% today is already fading
  const soonest = skills.filter(s => skillState(s) !== 'faded' && s.recall > FADE_THRESHOLD && s.daysUntilFade > 0).sort((a, b) => a.daysUntilFade - b.daysUntilFade)[0]
  const showCountdown = Boolean(soonest) && soonest.daysUntilFade <= 2
  const done = state.session.completedOn === todayKey()

  const start = () => {
    resetSession()
    setSession({ startedAt: Date.now() })
    nav('/session/question')
  }

  return (
    <div className="screen">
      {showCountdown ? (
        <div className="safe-top" style={{ background: 'var(--mist)', padding: '48px 24px 12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <span className="body-b">{soonest.name} is close to fading</span>
        </div>
      ) : <div className="safe-top" style={{ paddingTop: 48 }} />}

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 24px 0 24px' }}>
        <h1 className="greet">{greeting()}, {user.firstName}</h1>

        <div style={{ background: 'var(--navy)', borderRadius: 32, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="num-xl on-dark">{sessionSkills.length}</div>
            <div style={{ flex: 1 }} className="title on-dark">skills to refresh</div>
            <div className="small on-dark-2">About {today.session.estimatedMinutes} minutes</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sessionSkills.map(s => (
              <div key={s.id} style={{ height: 44, borderRadius: 16, background: 'var(--paper)', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="body-b">{s.name}</span><span className="small-b">{pct(s.recall)}</span>
              </div>
            ))}
          </div>
          {scenario && (
            <div style={{ borderRadius: 16, background: 'var(--sand)', padding: '8px 16px', display: 'flex', flexDirection: 'column' }}>
              <span className="small">1 scenario</span>
              <span className="body-b">{scenario.title}</span>
            </div>
          )}
          {done
            ? <div className="title on-dark" style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>Done for today. Next session tomorrow.</div>
            : <Btn cream onClick={start}>Start session</Btn>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="body-b">{today.streakDays + (done ? 1 : 0)} day streak</span><span className="small muted">This week</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }} role="list" aria-label="This week">
            {currentWeek().map(d => (
              <div key={d.date} role="listitem" className={`day${d.status === 'done' ? ' done' : d.status === 'today' ? ' today' : ''}`} aria-label={`${d.letter} ${d.date}${d.status === 'done' ? ', done' : d.status === 'today' ? ', today' : ''}`}>
                <span className="cap">{d.letter}</span><span className="body-b">{d.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="safe-bottom" style={{ padding: '16px 24px 24px 24px' }}>
        <Nav active="today" onGo={t => nav(`/${t}`)} />
      </div>
    </div>
  )
}
