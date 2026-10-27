import { useNavigate } from 'react-router-dom'
import { api, pct } from '../api'
import type { ChoiceStep, ExplainStep } from '../api/types'
import { todayKey, useStore, type Sure } from '../state/store'
import { Btn, BottomBar, Check, Cross, IconBtn, Nav, Opt, Segments } from '../components/ui'
import { PlanList } from './Onboarding'

export function Question() {
  const nav = useNavigate()
  const { state, setSession } = useStore()
  const s = state.session
  const questions = api.questionsForSession()
  const q = questions[s.questionIndex]
  if (!q) { nav('/session/scenario', { replace: true }); return null }
  const total = questions.length
  const skill = api.skill(q.skillId)
  const feedback = s.phase === 'feedback'
  const picked = q.options.find(o => o.id === s.picked)
  const right = picked?.id === q.correctId
  const v = api.verdicts()
  const dontKnow = s.sure === 'dontKnow'
  const verdict = dontKnow ? v.dontKnow : right ? (s.sure === 'sure' ? v.rightSure : v.rightNotSure) : (s.sure === 'sure' ? v.wrongSure : v.wrongNotSure)
  const last = s.questionIndex === total - 1

  const check = () => {
    if (!s.sure || !s.picked) return
    setSession(ss => ({ phase: 'feedback', answers: [...ss.answers.filter(a => a.questionId !== q.id), { questionId: q.id, optionId: s.picked!, sure: s.sure as Sure, right }] }))
  }
  //"I don't know" records the item as not recalled, so a blind guess never counts as remembering
  const skip = () => {
    setSession(ss => ({ phase: 'feedback', sure: 'dontKnow', picked: null, answers: [...ss.answers.filter(a => a.questionId !== q.id), { questionId: q.id, optionId: '', sure: 'dontKnow', right: false }] }))
  }
  const next = () => {
    if (last) nav('/session/scenario')
    else setSession({ questionIndex: s.questionIndex + 1, phase: 'ask', sure: null, picked: null })
  }

  return (
    <div className="screen" style={{ background: 'var(--navy)' }}>
      <div className="safe-top" style={{ padding: feedback ? '48px 24px 16px 24px' : '48px 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: feedback ? 12 : 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 20 }}>
          <span className="small-b on-dark">Question {s.questionIndex + 1} of {total}</span>
          <span className="small on-dark-2">{skill?.name}</span>
        </div>
        <h1 className={feedback ? 'title on-dark' : 'h1 on-dark'}>{q.prompt}</h1>
      </div>

      {!feedback ? (
        <div style={{ flex: 1, minHeight: 0, background: 'var(--paper)', borderRadius: '32px 32px 0 0', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="small-b" id="sure-label">How sure are you?</div>
            <div style={{ display: 'flex', gap: 8 }} role="group" aria-labelledby="sure-label">
              <Opt paper selected={s.sure === 'sure'} style={{ flex: 1 }} onClick={() => setSession({ sure: 'sure' })}>I'm sure</Opt>
              <Opt paper selected={s.sure === 'notSure'} style={{ flex: 1 }} onClick={() => setSession({ sure: 'notSure' })}>Not sure</Opt>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }} role="group" aria-label="Answers">
            {q.options.map(o => (
              <button type="button" key={o.id} className={`ans${s.picked === o.id ? ' sel' : ''}`} style={{ padding: 16 }} aria-pressed={s.picked === o.id} onClick={() => setSession({ picked: o.id })}>
                <span className="ltr body-b">{o.id}</span><span className={s.picked === o.id ? 'body-m' : 'body'}>{o.text}</span>
              </button>
            ))}
          </div>
          <div className="safe-bottom sticky-bottom" style={{ marginTop: 'auto', background: 'var(--paper)', paddingBottom: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Btn className="btn-soft" onClick={skip}>I don't know</Btn>
            <Btn off={!(s.sure && s.picked) || dontKnow} onClick={check}>Check answer</Btn>
          </div>
        </div>
      ) : (
        <>
          <div style={{ background: 'var(--paper)', borderRadius: '32px 32px 0 0', padding: '16px 24px 16px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {q.options.map(o => {
              const isRight = o.id === q.correctId
              const isPicked = o.id === s.picked
              const cls = isRight ? 'ans good' : isPicked ? 'ans bad' : 'ans dim'
              return (
                <div key={o.id} className={cls}>
                  {isRight ? <span className="ltr" style={{ height: 24, display: 'flex', alignItems: 'center' }}><Check size={20} width={3} label="Correct answer" /></span>
                    : isPicked ? <span className="ltr" style={{ height: 24, display: 'flex', alignItems: 'center' }}><Cross label="Your answer, wrong" /></span>
                      : <span className="ltr body-b">{o.id}</span>}
                  <span className={isRight || isPicked ? 'body-m' : 'body'}>{o.text}</span>
                </div>
              )
            })}
          </div>
          <div style={{ flex: 1, minHeight: 0, background: right ? 'var(--mint)' : 'var(--sand)', borderRadius: '32px 32px 0 0', padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }} aria-live="polite">
            <h2 className="h2">{verdict}</h2>
            {!right && picked?.misconception && <p className="body-m">{picked.misconception}</p>}
            <p className="body">{q.explanation}</p>
            <p className="title" style={right ? { marginTop: 8 } : undefined}>{right ? q.nextReviewIfRight : q.nextReviewIfWrong}</p>
            <div className="safe-bottom sticky-bottom" style={{ marginTop: 'auto', background: right ? 'var(--mint)' : 'var(--sand)', paddingBottom: 0 }}>
              <Btn onClick={next}>{last ? 'Start scenario' : 'Next question'}</Btn>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function ScenarioScreen() {
  const nav = useNavigate()
  const { state, setSession } = useStore()
  const s = state.session
  const sc = api.scenario(api.today().session.scenarioId)
  if (!sc) return null
  const stepIndex = s.scenarioStep
  const step = sc.steps[stepIndex]
  const total = sc.steps.length
  const back = () => stepIndex === 0 ? nav('/session/question') : setSession({ scenarioStep: stepIndex - 1 })
  const forward = () => {
    if (stepIndex < total - 1) setSession({ scenarioStep: stepIndex + 1 })
    else { setSession({ finishedAt: Date.now(), completedOn: todayKey() }); nav('/session/summary') }
  }

  const header = (title: React.ReactNode, extra?: React.ReactNode) => (
    <div className="safe-top" style={{ background: 'var(--mist)', padding: '48px 24px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconBtn mist aria-label="Back" onClick={back} />
        <span className="small-b">Step {stepIndex + 1} of {total}</span>
      </div>
      <Segments total={total} current={stepIndex + 1} emptyFill="var(--mist-d)" />
      {title}
      {extra}
    </div>
  )

  if (step.type === 'choice') {
    const choice: ChoiceStep = step
    const chosen = s.scenarioChoices[stepIndex] ?? null
    return (
      <div className="screen">
        {header(
          <h1 className="h2">{sc.title}</h1>,
          stepIndex === 0 ? (
            <>
              <p className="body">{sc.context}</p>
              <div style={{ background: 'var(--paper)', borderRadius: 16, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                {sc.figures.map(f => <div key={f.label} style={{ display: 'flex', flexDirection: 'column' }}><span className="h1">{f.value}</span><span className="small muted">{f.label}</span></div>)}
              </div>
            </>
          ) : undefined,
        )}
        <div style={{ flex: 1, minHeight: 0, padding: '16px 24px 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="title">{choice.prompt}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }} role="group" aria-label="Choices">
            {choice.options.map(o => (
              <button type="button" key={o.id} className={`ans${chosen === o.id ? ' sel' : ' ans-cream'}`} aria-pressed={chosen === o.id}
                onClick={() => setSession(ss => ({ scenarioChoices: { ...ss.scenarioChoices, [stepIndex]: o.id } }))}>
                <span className={chosen === o.id ? 'body-m' : 'body'}>{o.text}</span>
              </button>
            ))}
          </div>
        </div>
        <BottomBar top={16}><Btn off={!chosen} onClick={forward}>Continue</Btn></BottomBar>
      </div>
    )
  }

  const ex: ExplainStep = step
  const allRated = ex.checkpoints.every((_, i) => s.ratings[i])
  return (
    <div className="screen">
      {header(<h1 className="title">{ex.prompt}</h1>)}
      <div style={{ flex: 1, minHeight: 0, padding: '12px 24px 0 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label htmlFor="mine" className="small-b">Your answer</label>
          <textarea id="mine" className="small" rows={2} style={{ cursor: 'text', resize: 'none', width: '100%', height: 40 }}
            value={s.scenarioText} readOnly={s.scenarioSubmitted} onChange={e => setSession({ scenarioText: e.target.value })} />
        </div>
        {!s.scenarioSubmitted ? (
          <div style={{ marginTop: 8 }}><Btn off={s.scenarioText.trim().length === 0} onClick={() => setSession({ scenarioSubmitted: true })}>Compare with a model answer</Btn></div>
        ) : (
          <>
            <div style={{ background: 'var(--mint)', borderRadius: 16, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="small-b">Model answer</div>
              <p className="small">{ex.modelAnswer}</p>
            </div>
            <div className="small-b" style={{ marginTop: 12 }}>Rate your answer</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ex.checkpoints.map((c, i) => (
                <div key={i} style={{ background: 'var(--paper)', borderRadius: 16, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span className="small" id={`cp-${i}`}>{c.text}</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4 }} role="group" aria-labelledby={`cp-${i}`}>
                    {ex.ratingOptions.map(r => <Opt key={r} paper selected={s.ratings[i] === r} onClick={() => setSession(ss => ({ ratings: { ...ss.ratings, [i]: r } }))}>{r}</Opt>)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <BottomBar><Btn off={!allRated} onClick={forward}>Finish scenario</Btn></BottomBar>
    </div>
  )
}

//scoring default from SPEC section 8: one point per step, step 3 counts when no checkpoint is Missed
export function scenarioPoints(choices: Record<number, string>, ratings: Record<number, string>): number {
  const sc = api.scenario(api.today().session.scenarioId)
  if (!sc) return 0
  let pts = 0
  sc.steps.forEach((st, i) => {
    if (st.type === 'choice') pts += choices[i] === st.correctId ? 1 : 0
    else pts += st.checkpoints.every((_, k) => ratings[k] && ratings[k] !== 'Missed') ? 1 : 0
  })
  return pts
}

export function SummaryScreen() {
  const nav = useNavigate()
  const { state, setSession } = useStore()
  const s = state.session
  const mock = api.summary()
  const recalled = s.answers.filter(a => a.right).length
  const total = api.questionsForSession().length || mock.recallTotal
  const points = scenarioPoints(s.scenarioChoices, s.ratings)
  const secs = s.startedAt && s.finishedAt ? Math.max(0, Math.round((s.finishedAt - s.startedAt) / 1000)) : null
  const duration = secs === null ? mock.duration : `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
  //before and after values come from the model via the api module (mock for now)
  const changes = mock.changes.map(c => ({ ...c, name: api.skill(c.skillId)?.name ?? c.skillId }))
  return (
    <div className="screen">
      <div className="safe-top" style={{ background: 'var(--navy)', padding: '48px 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="title on-dark-2">Session complete</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span className="num-xl on-dark">{recalled} of {total}</span><span className="title on-dark">recalled</span>
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}><span className="num-l on-dark">{points} of {mock.scenarioTotal}</span><span className="small on-dark-2">scenario points</span></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}><span className="num-l on-dark">{duration}</span><span className="small on-dark-2">minutes</span></div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 4 }}>
        {changes.map(c => (
          <div key={c.skillId} style={{ background: c.improved ? 'var(--mint)' : 'var(--ochre)', padding: '12px 24px', display: 'flex', flexDirection: 'column' }}>
            <span className="body-b">{c.name}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="h1">{pct(c.before)} to {pct(c.after)}</span><span className="small">{c.next}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: '16px 24px 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="title" id="use-label">Where could you use one of these skills this week?</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }} role="group" aria-labelledby="use-label">
          {mock.useThisWeekOptions.map(o => <Opt key={o} selected={s.useThisWeek === o} onClick={() => setSession({ useThisWeek: o })}>{o}</Opt>)}
        </div>
      </div>
      <BottomBar top={16}><Btn onClick={() => nav('/skills')}>See my skills</Btn></BottomBar>
    </div>
  )
}

export function SkillsTab() {
  const nav = useNavigate()
  return (
    <div className="screen">
      <div className="safe-top" style={{ padding: '48px 24px 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 className="h1">Your skills</h1>
        <p className="small muted">Sorted by priority, recall today on the right</p>
      </div>
      <div style={{ flex: 1, minHeight: 0, paddingTop: 12 }}>
        <PlanList onPick={id => nav(`/skills/${id}`)} />
      </div>
      <div className="safe-bottom" style={{ padding: '16px 24px 24px 24px' }}>
        <Nav active="skills" onGo={t => nav(`/${t}`)} />
      </div>
    </div>
  )
}
