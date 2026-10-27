import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, fadeLabel, pct, sortByPriority, skillState, stateFill } from '../api'
import { useStore } from '../state/store'
import { Btn, BottomBar, Check, Note, Opt, StepHeader } from '../components/ui'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const YEARS = [2022, 2023, 2024, 2025, 2026, 2027]

export function Welcome() {
  const nav = useNavigate()
  const { resetAll } = useStore()
  const bars: Array<[number, string]> = [[220, 'sky'], [188, 'sky'], [156, 'sky'], [128, 'sky'], [100, 'sand'], [76, 'ochre'], [56, 'ochre']]
  return (
    <div className="screen" style={{ background: 'var(--navy)' }}>
      <div className="safe-top" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24, padding: '48px 24px 32px 24px', minHeight: 0 }}>
        <div className="h2 on-dark">Recall</div>
        <div aria-hidden="true" style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 12, minHeight: 0 }}>
          {bars.map(([h, c], i) => <div key={i} style={{ flex: 1, height: h, borderRadius: 999, background: `var(--${c})` }} />)}
        </div>
        <h1 className="num-l on-dark">Keep the skills you worked for.</h1>
      </div>
      <div className="safe-bottom" style={{ background: 'var(--paper)', borderRadius: '32px 32px 0 0', padding: '32px 24px 32px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p className="title" style={{ fontWeight: 500 }}>Skills are like muscles: they weaken without training. Recall finds the ones from your program that are fading and matter for the job you want, and trains them in five minutes a day.</p>
        <Note>Uploading a transcript is optional. If you do, it is read once to find your courses, then deleted. You can stop anytime.</Note>
        {/* starting setup clears any earlier run, so every visit from the welcome screen begins from scratch */}
        <Btn onClick={() => { resetAll(); nav('/setup/survey') }}>Start setup</Btn>
      </div>
    </div>
  )
}

function Group({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {htmlFor ? <label htmlFor={htmlFor} className="small-b">{label}</label> : <div className="small-b">{label}</div>}
      {children}
    </div>
  )
}

//native select styled as a filled pill; navy once a value is chosen
function PillSelect({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: string[]; label: string }) {
  const chosen = value !== ''
  return (
    <select aria-label={label} value={value} onChange={e => onChange(e.target.value)}
      className={`opt${chosen ? ' sel' : ''}`} style={{ flex: 1, width: '100%', textAlign: 'center', textAlignLast: 'center', padding: '0 16px' }}>
      <option value="" disabled>{label}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

export function SetupSurvey() {
  const nav = useNavigate()
  const { state, set } = useStore()
  const s = state.survey
  const opts = api.survey()
  const up = (patch: Partial<typeof s>) => set({ survey: { ...s, ...patch } })
  const ready = Boolean(s.targetRole && s.finishedMonth && s.finishedYear && s.mainGoal && s.timePerDay && s.reminderTime)
  return (
    <div className="screen">
      <StepHeader step={1} total={4} title="Tell us about you" />
      <div style={{ flex: 1, minHeight: 0, padding: '16px 24px 0 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Group label="Target role">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {opts.targetRoleOptions.map(o => <Opt key={o} selected={s.targetRole === o} style={{ padding: '0 16px' }} onClick={() => up({ targetRole: o })}>{o}</Opt>)}
          </div>
        </Group>
        <Group label="When did you finish your program?">
          <div style={{ display: 'flex', gap: 8 }}>
            <PillSelect label="Month" value={s.finishedMonth ?? ''} options={MONTHS} onChange={v => up({ finishedMonth: v })} />
            <PillSelect label="Year" value={s.finishedYear ? String(s.finishedYear) : ''} options={YEARS.map(String)} onChange={v => up({ finishedYear: Number(v) })} />
          </div>
        </Group>
        <Group label="Main goal">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {opts.mainGoalOptions.map(o => <Opt key={o} selected={s.mainGoal === o} onClick={() => up({ mainGoal: o })}>{o}</Opt>)}
          </div>
        </Group>
        <Group label="Which skills do you most want to keep?" htmlFor="keep">
          <div className="field" style={{ height: 56, display: 'flex', alignItems: 'center' }}>
            <input id="keep" className="body" style={{ width: '100%', cursor: 'text' }} value={s.skillsToKeep} onChange={e => up({ skillsToKeep: e.target.value })} />
          </div>
        </Group>
        <Group label="Time per day">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {opts.timePerDayOptions.map(o => <Opt key={o} selected={s.timePerDay === o} onClick={() => up({ timePerDay: o })}>{o}</Opt>)}
          </div>
        </Group>
        <Group label="Reminder time">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
            {opts.reminderTimeOptions.map(o => <Opt key={o} selected={s.reminderTime === o} onClick={() => up({ reminderTime: o })}>{o}</Opt>)}
          </div>
        </Group>
      </div>
      <BottomBar top={16}><Btn off={!ready} onClick={() => nav('/setup/record')}>Continue</Btn></BottomBar>
    </div>
  )
}

export function CourseRecord() {
  const nav = useNavigate()
  const { state, set } = useStore()
  const t = api.transcript()
  const fileRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState(0)
  const phase = state.transcript

  //the mock parser: the file is read, never stored, and the result comes from mock data
  useEffect(() => {
    if (phase !== 'processing') return
    setProgress(0)
    const id = window.setInterval(() => setProgress(p => Math.min(100, p + 12)), 120)
    const done = window.setTimeout(() => { window.clearInterval(id); set({ transcript: 'done' }) }, 1300)
    return () => { window.clearInterval(id); window.clearTimeout(done) }
  }, [phase, set])

  const onFile = () => {
    if (fileRef.current) fileRef.current.value = ''
    set({ transcript: 'processing' })
  }

  return (
    <div className="screen">
      <StepHeader step={2} total={4} title="Your course record" nowrap onBack={() => nav('/setup/survey')} />
      {phase === 'done' ? (
        <div style={{ flex: 1, minHeight: 0, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ background: 'var(--navy)', padding: '12px 24px', height: 96, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="num-xl on-dark">{t.summary.read}</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="title on-dark">courses read</div>
              <div className="small on-dark-2">File deleted</div>
            </div>
          </div>
          <div style={{ background: 'var(--sky)', padding: '12px 24px', height: 72, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="num-l">{t.summary.matching}</div>
            <div className="body-m">match data science and statistics</div>
          </div>
          <div style={{ background: 'var(--sand)', padding: '12px 24px', height: 72, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="num-l">{t.summary.averageGrade.toFixed(1)}</div>
            <div className="body-m">average grade, out of {t.summary.gradeScaleMax}</div>
          </div>
          <div style={{ padding: '12px 24px 0 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {t.courses.map(c => (
              <div key={c.name} style={{ height: 32, borderRadius: 12, background: c.matches ? 'var(--mint)' : 'var(--cream-2)', padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={c.matches ? 'small' : 'small muted'} style={{ flex: 1 }}>{c.name}</span>
                {c.matches && <span className="cap">Match</span>}
                <span className={c.matches ? 'small-b' : 'small-b muted'} style={{ width: 28, textAlign: 'right' }}>{c.grade.toFixed(1)}</span>
              </div>
            ))}
          </div>
          <Note margin="12px 24px 0 24px">Course names and grades are enough. Leave out syllabi and lesson plans.</Note>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, padding: '12px 24px 0 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--paper-2)', borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {phase === 'processing' ? (
              <>
                <div className="title">Reading your transcript</div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--cream-2-d)', overflow: 'hidden' }} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Reading your transcript">
                  <div style={{ height: '100%', width: `${progress}%`, background: 'var(--navy)', transition: 'width 150ms' }} />
                </div>
              </>
            ) : (
              <>
                <p className="small muted">Course names and grades are enough. Leave out syllabi and lesson plans.</p>
                <Btn onClick={() => fileRef.current?.click()}>Upload transcript</Btn>
                <input ref={fileRef} type="file" accept="application/pdf,image/*" hidden aria-label="Transcript file" onChange={onFile} />
                <p className="small muted">PDF or image. Read once, then deleted.</p>
              </>
            )}
          </div>
        </div>
      )}
      <BottomBar>
        {phase === 'before'
          ? <Btn className="btn-soft" onClick={() => nav('/setup/topics')}>Skip for now</Btn>
          : <Btn off={phase !== 'done'} onClick={() => nav('/setup/topics')}>Continue</Btn>}
      </BottomBar>
    </div>
  )
}

export function TopicPicker() {
  const nav = useNavigate()
  const { state, set } = useStore()
  const topics = api.topics()
  const anyTicked = Object.values(state.topics).some(t => t.ticked)
  const update = (id: string, patch: Partial<{ ticked: boolean; confidence: number | null }>) =>
    set(s => ({ topics: { ...s.topics, [id]: { ...s.topics[id], ...patch } } }))
  const toggle = (id: string) => {
    const t = state.topics[id]
    update(id, t.ticked ? { ticked: false } : { ticked: true, confidence: t.confidence ?? 3 })
  }
  return (
    <div className="screen">
      <StepHeader step={3} total={4} title="What did you study?" nowrap onBack={() => nav('/setup/record')} />
      <div style={{ flex: 1, minHeight: 0, padding: '12px 24px 0 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {topics.map(tp => {
          const t = state.topics[tp.id]
          return (
            <div key={tp.id} style={{ height: 52, borderRadius: 16, background: t.ticked ? 'var(--mint)' : 'var(--cream-2)', padding: '0 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <button type="button" className={`tick${t.ticked ? ' on' : ''}`} aria-label={t.ticked ? 'Selected' : 'Not selected'} aria-pressed={t.ticked} onClick={() => toggle(tp.id)}>
                {t.ticked && <Check />}
              </button>
              <button type="button" className={t.ticked ? 'small-b' : 'small muted'} style={{ flex: 1, minHeight: 44, display: 'flex', alignItems: 'center' }} onClick={() => toggle(tp.id)}>{tp.name}</button>
              <div className={`rate${t.ticked ? ' rate-on-pale' : ''}`} role={t.ticked ? 'group' : 'img'} aria-label={t.ticked ? `Confidence ${t.confidence} of 5` : 'Confidence not set'}>
                {[1, 2, 3, 4, 5].map(n => t.ticked
                  ? <button type="button" key={n} aria-label={`Confidence ${n}`} aria-pressed={(t.confidence ?? 0) >= n} onClick={() => update(tp.id, { confidence: n })} style={{ display: 'flex', alignItems: 'flex-end', height: 28, padding: '0 0 0 0' }}><i className={(t.confidence ?? 0) >= n ? 'on' : undefined} style={{ height: 8 + 4 * n }} /></button>
                  : <i key={n} />)}
              </div>
            </div>
          )
        })}
      </div>
      <BottomBar><Btn off={!anyTicked} onClick={() => nav('/setup/plan')}>Continue</Btn></BottomBar>
    </div>
  )
}

export function PlanList({ onPick }: { onPick?: (id: string) => void }) {
  const { state } = useStore()
  const skills = sortByPriority(api.skills().filter(s => state.topics[s.id]?.ticked ?? true))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {skills.map(s => {
        const row = (
          <>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span className="body-b">{s.name}</span>
              <span className="small">{fadeLabel(s)}, job weight {s.jobWeight.toFixed(1)}</span>
            </div>
            <div className="h1">{pct(s.recall)}</div>
          </>
        )
        const style = { height: 64, background: stateFill(skillState(s)), padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, width: '100%' } as const
        return onPick
          ? <button type="button" key={s.id} style={style} onClick={() => onPick(s.id)} aria-label={`${s.name}, ${fadeLabel(s)}, recall ${pct(s.recall)}`}>{row}</button>
          : <div key={s.id} style={style}>{row}</div>
      })}
    </div>
  )
}

export function YourPlan() {
  const nav = useNavigate()
  const { set } = useStore()
  return (
    <div className="screen">
      <StepHeader step={4} total={4} title="Your plan" subtitle="Sorted by priority, recall today on the right" onBack={() => nav('/setup/topics')} />
      <div style={{ flex: 1, minHeight: 0, paddingTop: 12 }}><PlanList /></div>
      <BottomBar><Btn onClick={() => { set({ onboarded: true }); nav('/today') }}>Start today's practice</Btn></BottomBar>
    </div>
  )
}
