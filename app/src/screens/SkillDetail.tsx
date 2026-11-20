import { useNavigate, useParams } from 'react-router-dom'
import { api, fadeLabel, jobWeightNotes, skillState, stateFill } from '../api'
import { useStore } from '../state/store'
import type { SkillDetail as Detail } from '../api/types'
import { IconBtn } from '../components/ui'
import { PILOT } from '../pilot/config'
import { curveFor, dayNumber, pilot } from '../pilot/engine'

//pilot: the curve and the answer list come from the person's own practice
function pilotDetail(id: string, base: Detail): Detail {
  const h = pilot().history[id] ?? []
  const today = dayNumber()
  return {
    ...base, skillId: id, curve: curveFor(id), nextPractice: h.length ? 'Comes back on your schedule' : 'In an upcoming session',
    recentAnswers: h.slice(-4).reverse().map(p => ({ topic: `${p.kind === 'checkin' ? 'Final check' : 'Practice'} ${p.itemId}`, correct: p.right, daysAgo: today - p.day })),
  }
}

const W = 342, H = 270, X0 = 44, X1 = 330, Y0 = 20, Y1 = 228

function curvePoints(d: Detail['curve']) {
  //recall between practices: start * 2^(-(t - fromDay) / halfLife), sampled once per day
  const x = (t: number) => X0 + (t / d.axisDays) * (X1 - X0)
  const y = (r: number) => Y0 + (1 - r) * (Y1 - Y0)
  const r = (t: number) => {
    const seg = d.segments.find(s => t >= s.fromDay && t <= s.toDay && !(t === s.toDay && d.segments.some(o => o.fromDay === t && o !== s))) ?? d.segments[d.segments.length - 1]
    return seg.start * Math.pow(2, -(t - seg.fromDay) / seg.halfLife)
  }
  const history: string[] = []
  for (let t = 0; t <= d.todayDay; t++) {
    const jump = d.practiceDays.includes(t) && t > 0
    if (jump) {
      const before = d.segments.find(s => s.toDay === t)!
      history.push(`L ${x(t).toFixed(1)} ${y(before.start * Math.pow(2, -(t - before.fromDay) / before.halfLife)).toFixed(1)}`)
    }
    history.push(`${t === 0 ? 'M' : 'L'} ${x(t).toFixed(1)} ${y(r(t)).toFixed(1)}`)
  }
  const projection: string[] = []
  for (let t = d.projectionFromDay; t <= d.axisDays; t++) projection.push(`${t === d.projectionFromDay ? 'M' : 'L'} ${x(t).toFixed(1)} ${y(r(t)).toFixed(1)}`)
  const markers = d.practiceDays.map(t => ({ x: x(t), y: y(r(t)) }))
  const today = { x: x(d.todayDay), y: y(r(d.todayDay)), r: r(d.todayDay) }
  return { history: history.join(' '), projection: projection.join(' '), markers, today, x, y }
}

export function ForgettingCurve({ d }: { d: Detail['curve'] }) {
  const c = curvePoints(d)
  const y60 = c.y(0.6)
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" style={{ maxWidth: '100%', height: 'auto' }}
      aria-label={`Forgetting curve over ${d.axisDays} days. Recall falls toward the fade line, and practice on days ${d.practiceDays.join(', ')} lifts it back up. The dot marks today.`}>
      <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke="var(--cream-2-d)" strokeWidth="2" />
      <line x1={X0} y1={y60} x2={X1} y2={y60} stroke="var(--ochre)" strokeWidth="3" />
      <text x="38" y={y60 + 3.8} textAnchor="end" fontSize="12" fontWeight="500" fill="var(--ink-2)">Fade</text>
      <text x="160" y={y60 + 20.8} fontSize="12" fontWeight="500" fill="var(--ink)">fades here</text>
      <path d={c.history} fill="none" stroke="var(--navy)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <path d={c.projection} fill="none" stroke="var(--sky-d)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <line x1={c.today.x} y1={c.today.y} x2={c.today.x} y2={Y1} stroke="var(--cream-2-d)" strokeWidth="2" />
      {c.markers.map((m, i) => <rect key={i} x="-5" y="-5" width="10" height="10" transform={`translate(${m.x.toFixed(1)} ${m.y.toFixed(1)}) rotate(45)`} fill="var(--ink)" />)}
      {c.markers[0] && <text x={c.markers[0].x.toFixed(1)} y="26" textAnchor="middle" fontSize="12" fontWeight="500" fill="var(--ink)">Practice</text>}
      <circle cx={c.today.x.toFixed(1)} cy={c.today.y.toFixed(1)} r="7" fill="var(--ink)" />
      <text x={(c.today.x - 8).toFixed(1)} y={(c.today.y + 51).toFixed(1)} textAnchor="end" fontSize="12" fontWeight="500" fill="var(--ink)">Today</text>
      <text x={X0} y="250" textAnchor="middle" fontSize="12" fontWeight="500" fill="var(--ink-2)">0</text>
      <text x={c.x(20).toFixed(1)} y="250" textAnchor="middle" fontSize="12" fontWeight="500" fill="var(--ink-2)">20</text>
      <text x={c.x(40).toFixed(1)} y="250" textAnchor="middle" fontSize="12" fontWeight="500" fill="var(--ink-2)">40</text>
      <text x={X1} y="250" textAnchor="end" fontSize="12" fontWeight="500" fill="var(--ink-2)">{d.axisDays} days</text>
    </svg>
  )
}

export function SkillDetailScreen() {
  const nav = useNavigate()
  const { id = '' } = useParams()
  const { state: app } = useStore()
  const roles = app.survey.targetRoles
  const skill = api.skill(id, roles)
  const d = PILOT ? pilotDetail(id, api.skillDetail(id)) : api.skillDetail(id)
  if (!skill) { nav('/skills', { replace: true }); return null }
  const state = skillState(skill)
  const fill = stateFill(state)
  const backFill = state === 'faded' ? 'var(--ochre-d)' : state === 'fadingSoon' ? 'var(--sand-d)' : 'var(--mint-d)'
  const right = d.recentAnswers.filter(a => a.correct).length
  const wrong = d.recentAnswers.length - right
  return (
    <div className="screen">
      <div className="safe-top" style={{ background: fill, padding: '48px 24px 16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 12 }}>
          <IconBtn aria-label="Back" fill={backFill} onClick={() => nav(-1)} />
          <h1 className="h2">{skill.name}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}><span className="h1">{fadeLabel(skill)}</span><span className="small">how this skill stands today</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span className="body-b">Half-life {skill.halfLifeDays ?? d.halfLifeDays} days</span>
            <span className="body-b">Job weight {skill.jobWeight.toFixed(1)}</span>
          </div>
        </div>
        <p className="small">{api.plain(skill.id)}</p>
        {/* the job weight explains itself with the real posting counts behind it */}
        {jobWeightNotes(skill.id, roles).map(n => <p key={n} className="small">{n}</p>)}
      </div>
      <div style={{ margin: '12px 24px 0 24px', background: 'var(--paper)', borderRadius: 24, overflow: 'hidden' }}>
        <ForgettingCurve d={d.curve} />
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: '12px 24px 0 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="small-b" style={{ marginBottom: 4 }}>Recent answers: {right} right, {wrong} wrong</div>
        {d.recentAnswers.map((a, i) => (
          <div key={`${a.topic}-${i}`} style={{ height: 36, borderRadius: 12, background: a.correct ? 'var(--mint)' : 'var(--ochre)', padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="small">{a.topic}</span><span className="small-b">{a.correct ? 'Right' : 'Wrong'}, {a.daysAgo === 0 ? 'today' : a.daysAgo === 1 ? '1 day ago' : `${a.daysAgo} days ago`}</span>
          </div>
        ))}
      </div>
      <div className="safe-bottom" style={{ background: 'var(--navy)', borderRadius: '32px 32px 0 0', padding: '16px 24px 24px 24px', marginTop: 12 }}>
        <div className="title on-dark">Next practice: {d.nextPractice}</div>
      </div>
    </div>
  )
}
