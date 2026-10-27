//screenshots every designed state at 390 x 844, device scale 2, and builds side-by-side comparisons
//usage: node compare/shots.mjs   (dev server on :5173)
import { chromium } from 'playwright'
import { mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const BASE = 'http://localhost:5173'
const OUT = 'compare/out'
const DESIGN = process.env.DESIGN_DIR || '../design/screenshots'
mkdirSync(OUT, { recursive: true })

//state that reproduces the designed screens: mock survey answers, transcript parsed, mock topics ticked
const seeded = {
  survey: { targetRole: 'Data scientist', finishedMonth: 'May', finishedYear: 2026, mainGoal: 'Interview prep', skillsToKeep: 'Experiment design, regression, SQL', timePerDay: '5 minutes', reminderTime: '12:30' },
  transcript: 'done', onboarded: true, remindersPaused: false,
  topics: { cleaning: { ticked: true, confidence: 4 }, exploring: { ticked: true, confidence: 3 }, probability: { ticked: true, confidence: 2 }, inference: { ticked: true, confidence: 3 }, regression: { ticked: true, confidence: 4 }, causal: { ticked: true, confidence: 2 }, ml: { ticked: true, confidence: 3 }, bayesian: { ticked: false, confidence: null }, pythonsql: { ticked: false, confidence: null }, communicating: { ticked: true, confidence: 4 } },
  session: { startedAt: null, questionIndex: 0, phase: 'ask', sure: null, picked: null, answers: [], scenarioStep: 0, scenarioChoices: {}, scenarioText: '', scenarioSubmitted: false, ratings: {}, finishedAt: null, completedOn: null, useThisWeek: null },
}
const sess = (patch) => ({ ...seeded, session: { ...seeded.session, ...patch } })
const answers3 = [
  { questionId: 'q-ml-rf', optionId: 'B', sure: 'sure', right: true },
  { questionId: 'q-t04-01', optionId: 'B', sure: 'sure', right: true },
  { questionId: 'q-t10-02', optionId: 'A', sure: 'notSure', right: false },
]

const shots = [
  ['01-welcome', '/', seeded],
  ['02-setup-survey', '/setup/survey', seeded],
  ['03-course-record', '/setup/record', seeded],
  ['03x-course-record-before', '/setup/record', { ...seeded, transcript: 'before' }],
  ['04-topic-picker', '/setup/topics', seeded],
  ['05-your-plan', '/setup/plan', seeded],
  ['06-today', '/today', seeded],
  ['06x-today-done', '/today', sess({ completedOn: new Date().toISOString().slice(0, 10) })],
  ['07-recall-question', '/session/question', sess({ startedAt: Date.now(), sure: 'sure' })],
  ['08a-feedback-right', '/session/question', sess({ startedAt: Date.now(), sure: 'sure', picked: 'B', phase: 'feedback', answers: [answers3[0]] })],
  ['08b-feedback-wrong', '/session/question', sess({ startedAt: Date.now(), sure: 'sure', picked: 'D', phase: 'feedback', answers: [{ ...answers3[0], optionId: 'D', right: false }] })],
  ['09a-scenario-step-1', '/session/scenario', sess({ startedAt: Date.now(), answers: answers3, questionIndex: 2, phase: 'feedback', scenarioChoices: { 0: 'c' } })],
  ['09x-scenario-step-2', '/session/scenario', sess({ startedAt: Date.now(), answers: answers3, questionIndex: 2, scenarioStep: 1, scenarioChoices: { 0: 'c' } })],
  ['09b-scenario-step-3', '/session/scenario', sess({ startedAt: Date.now(), answers: answers3, questionIndex: 2, scenarioStep: 2, scenarioChoices: { 0: 'c', 1: 'a' }, scenarioText: 'The lift is 0.5 points but p is 0.08, so I would extend the test before shipping.', scenarioSubmitted: true, ratings: { 0: 'Matched', 1: 'Partly', 2: 'Missed' } })],
  ['10-session-summary', '/session/summary', sess({ startedAt: Date.now() - 292_000, finishedAt: Date.now(), answers: answers3, scenarioChoices: { 0: 'c', 1: 'a' }, ratings: { 0: 'Matched', 1: 'Matched', 2: 'Matched' }, completedOn: new Date().toISOString().slice(0, 10) })],
  ['11-skill-detail', '/skills/inference', seeded],
  ['11x-skills-tab', '/skills', seeded],
  ['11y-profile', '/profile', seeded],
]

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium' })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
await page.addInitScript(() => { const d = new Date(2026, 9, 16, 14, 30); Date.now = () => d.getTime() })
const errors = []
page.on('pageerror', e => errors.push(String(e)))
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })

for (const [name, path, state] of shots) {
  await page.goto(`${BASE}/?frame`)
  await page.evaluate(s => localStorage.setItem('recall.v1', JSON.stringify(s)), state)
  await page.goto(`${BASE}${path}?frame`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  const design = `${DESIGN}/${name}.png`
  if (existsSync(design)) {
    try {
      execSync(`python3 compare/sbs.py "${design}" "${OUT}/${name}.png" "${OUT}/${name}-compare.png"`)
    } catch (e) { errors.push(`compare ${name}: ${e.message}`) }
  }
  console.log('shot', name)
}
await browser.close()
writeFileSync(`${OUT}/errors.txt`, errors.join('\n'))
console.log('errors:', errors.length ? errors : 'none')
