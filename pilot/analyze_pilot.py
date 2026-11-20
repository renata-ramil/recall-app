"""
Recall pilot analysis. Reads the Google Sheet tabs (downloaded as CSV) and writes the pilot results.

Usage:
  python3 pilot/analyze_pilot.py path/to/folder_with_csvs [--label "REAL"|"SIMULATED"]

The folder holds one CSV per sheet tab: answer.csv, session_done.csv, rest_day.csv, consent.csv
(File > Download > Comma-separated values, once per tab). A JSON-lines log from the test server also works.

What it reports, in the order of the pilot plan (PILOT_PLAN in the capstone folder):
  1. Participation: who started, sessions finished, share of due days with a finished session.
  2. Final check: share right on the closing check-in, personalized half against fixed half,
     the within-person difference and a bootstrap 95% interval over participants.
  3. Dose: reviews per skill in each half, so a win is not just more practice.
  4. The forgetting estimate: calibration of the app's predicted recall against real answers,
     and log loss against a constant-rate baseline (the same comparison as the Duolingo run).
  5. "I don't know" share.
Results are lessons about Recall only (IRB exemption condition), never claims about graduates in general.
"""
import argparse
import json
import os
import sys

import numpy as np
import pandas as pd

RNG = np.random.default_rng(7)


def load(folder):
    tabs = {}
    jl = [f for f in os.listdir(folder) if f.endswith(('.jsonl', '.txt'))]
    if jl:
        rows = []
        for f in jl:
            for line in open(os.path.join(folder, f)):
                line = line.strip()
                if line:
                    got = json.loads(line)
                    rows.extend(got if isinstance(got, list) else [got])
        df = pd.DataFrame(rows)
        for ev, g in df.groupby('event'):
            tabs[ev] = g.dropna(axis=1, how='all').reset_index(drop=True)
    for f in os.listdir(folder):
        if f.endswith('.csv'):
            tabs[f[:-4]] = pd.read_csv(os.path.join(folder, f))
    return tabs


def boot_mean(x, n=5000):
    x = np.asarray(x, dtype=float)
    if len(x) < 2:
        return (np.nan, np.nan)
    means = RNG.choice(x, size=(n, len(x)), replace=True).mean(axis=1)
    return tuple(np.percentile(means, [2.5, 97.5]))


def logloss(y, p):
    p = np.clip(p, 1e-4, 1 - 1e-4)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('folder')
    ap.add_argument('--label', default='REAL')
    ap.add_argument('--out', default=None)
    a = ap.parse_args()
    tabs = load(a.folder)
    if 'answer' not in tabs:
        sys.exit('No answer rows found.')
    #a row can arrive twice if the page closed while it was sending
    tabs = {k: v.drop_duplicates(subset=[c for c in ['event', 'code', 'ts'] if c in v.columns]) for k, v in tabs.items()}
    ans = tabs['answer'].copy()
    for c in ['right', 'dont_know', 'predicted', 'gap_days', 'n_before']:
        ans[c] = pd.to_numeric(ans[c], errors='coerce')
    ans['date'] = pd.to_datetime(ans['ts']).dt.date
    out = [f'# Recall pilot results ({a.label})', '']
    if a.label != 'REAL':
        out += [f'**{a.label} DATA. These numbers come from a test run, not from people.**', '']

    # 1. participation
    people = sorted(ans['code'].unique())
    done = tabs.get('session_done', pd.DataFrame(columns=['code', 'ts']))
    rest = tabs.get('rest_day', pd.DataFrame(columns=['code', 'ts']))
    out += ['## 1. Participation', '', '| Code | Sessions finished | Days with nothing due | First day | Last day |', '|---|---|---|---|---|']
    for c in people:
        d = pd.to_datetime(done[done['code'] == c]['ts']).dt.date
        r = pd.to_datetime(rest[rest['code'] == c]['ts']).dt.date
        days = ans[ans['code'] == c]['date']
        out.append(f'| {c} | {d.nunique()} | {r.nunique()} | {days.min()} | {days.max()} |')
    sessions = [pd.to_datetime(done[done['code'] == c]['ts']).dt.date.nunique() for c in people]
    out += ['', f'{len(people)} people started. Median sessions finished: {np.median(sessions):.0f}. '
            f'People with at least 10 finished sessions or rest days: '
            f'{sum(1 for c in people if pd.to_datetime(pd.concat([done[done.code == c].ts, rest[rest.code == c].ts])).dt.date.nunique() >= 10)}.', '']

    # 2. final check
    chk = ans[ans['kind'] == 'checkin']
    out += ['## 2. Final check (days 15 and 16)', '']
    if len(chk):
        per = chk.groupby(['code', 'group'])['right'].mean().unstack()
        both = per.dropna()
        diff = (both.get('model', np.nan) - both.get('fixed', np.nan)).dropna()
        lo, hi = boot_mean(diff)
        out += ['| Half | Answers | Share right |', '|---|---|---|']
        for g, gg in chk.groupby('group'):
            out.append(f'| {g} | {len(gg)} | {gg["right"].mean():.0%} |')
        out += ['', f'Within-person difference, personalized minus fixed: {diff.mean():+.0%} '
                f'(bootstrap 95% interval {lo:+.0%} to {hi:+.0%}, {len(diff)} people with both halves).', '']
        gap = chk.groupby('group')['gap_days'].median()
        out += [f'Median days since the last practice at the check: ' + ', '.join(f'{g} {v:.1f}' for g, v in gap.items()) + '.', '']
    else:
        out += ['No check-in answers yet.', '']

    # 3. dose
    prac = ans[ans['kind'] == 'practice']
    dose = prac.groupby(['code', 'group', 'skill']).size().groupby('group').mean()
    out += ['## 3. Reviews per skill', '', '| Half | Mean practices per skill before the check |', '|---|---|']
    out += [f'| {g} | {v:.1f} |' for g, v in dose.items()] + ['']

    # 4. calibration on real reviews (not the first practice, which starts from course memory)
    rev = ans[(ans['n_before'] > 0)].dropna(subset=['predicted'])
    out += ['## 4. The forgetting estimate on pilot answers', '']
    if len(rev) >= 10:
        y, p = rev['right'].to_numpy(), rev['predicted'].to_numpy()
        base = np.full_like(p, y.mean())
        out += [f'{len(rev)} reviews. Log loss of the app estimate: {logloss(y, p):.3f}. '
                f'Constant rate ({y.mean():.0%} right): {logloss(y, base):.3f}. Lower is better.', '',
                '| Predicted recall | Reviews | Share right |', '|---|---|---|']
        bins = pd.cut(rev['predicted'], [0, .4, .6, .8, 1.0])
        for b, g in rev.groupby(bins, observed=True):
            out.append(f'| {b} | {len(g)} | {g["right"].mean():.0%} |')
        out.append('')
    else:
        out += ['Fewer than 10 reviews so far.', '']

    # 5. I don't know
    out += ['## 5. "I don\'t know"', '', f'{ans["dont_know"].mean():.0%} of all answers used "I don\'t know".', '']
    # 6. landing page
    if 'visit' in tabs:
        v = tabs['visit']['visit'].nunique() if 'visit' in tabs['visit'] else len(tabs['visit'])
        sg = tabs.get('signup', pd.DataFrame())
        n = sg['email'].str.lower().nunique() if len(sg) else 0
        out += ['## 6. Landing page', '', f'{v} visits, {n} sign-ups, conversion {n / v:.0%} (pass line: at least 10% of 100 or more visits).', '']
        if len(sg):
            out += ['| Segment | Sign-ups |', '|---|---|'] + [f'| {k} | {c} |' for k, c in sg['segment'].value_counts().items()] + ['']
    text = '\n'.join(out)
    path = a.out or os.path.join(a.folder, f'pilot_results_{a.label.lower()}.md')
    open(path, 'w').write(text)
    print(text)


if __name__ == '__main__':
    main()
