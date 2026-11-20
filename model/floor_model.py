"""
Does the Duolingo-style curve fit skills that graduates have not used for months?

The question: a vocabulary curve keeps falling toward zero, but research on course knowledge
suggests details fade while concepts level off. This script compares two curves on the pilot's FIRST answers
for each skill, where the gap is the months since the person finished their program:

  plain:  p = c * 2^(-gap / h)
  floor:  p = c * (f + (1 - f) * 2^(-gap / h))     f = the share that stays, one value for detail items, one for concept items

  log2(h) = a + b * (confidence - 3), from the 1 to 5 rating in setup.

Hypothesis (written before the pilot): for gaps of months, the floor curve predicts first answers better than the
plain curve, and the floor is higher for concept items than for detail items.
Test: leave-one-person-out log loss, floor against plain. The floor curve wins if its log loss is lower.

Usage:
  python3 model/floor_model.py pilot_folder         # real pilot data (answer + setup tabs as CSV, or the JSON-lines log)
  python3 model/floor_model.py --power              # SIMULATED check: can 10 to 30 people tell the curves apart?
"""
import argparse
import json
import os
import sys

import numpy as np
from scipy.optimize import minimize

C = 0.918  # slip ceiling from the Duolingo fit

#detail items ask for a term, a function or a line of code; concept items ask to interpret or choose a method.
#This split is by question format and is a first proposal, to be reviewed item by item.
DETAIL_FORMATS = {'fill_blank', 'fix_code'}


def kind_of(item):
    return 'detail' if item['format'] in DETAIL_FORMATS else 'concept'


def p_plain(th, gap, conf, concept):
    a, b = th[:2]
    h = 2 ** (a + b * (conf - 3))
    return C * 2 ** (-gap / h)


def p_floor(th, gap, conf, concept):
    a, b, zd, zc = th
    h = 2 ** (a + b * (conf - 3))
    f = np.where(concept == 1, 1 / (1 + np.exp(-zc)), 1 / (1 + np.exp(-zd)))
    return C * (f + (1 - f) * 2 ** (-gap / h))


def nll(th, model, y, gap, conf, concept):
    p = np.clip(model(th, gap, conf, concept), 1e-4, 1 - 1e-4)
    return -np.sum(y * np.log(p) + (1 - y) * np.log(1 - p))


def fit(model, y, gap, conf, concept):
    x0 = [np.log2(120), 0.5] + ([0.0, 0.0] if model is p_floor else [])
    best = None
    for start in ([0, 0], [-2, -1], [1, 2]) if model is p_floor else ([0, 0],):
        th0 = np.array(x0, dtype=float)
        if model is p_floor:
            th0[2:] = start
        r = minimize(nll, th0, args=(model, y, gap, conf, concept), method='Nelder-Mead', options={'maxiter': 4000, 'xatol': 1e-4, 'fatol': 1e-6})
        if best is None or r.fun < best.fun:
            best = r
    return best.x


def lopo(people, y, gap, conf, concept):
    """leave-one-person-out log loss for each curve"""
    out = {'plain': [], 'floor': []}
    for p in np.unique(people):
        tr, te = people != p, people == p
        for name, m in (('plain', p_plain), ('floor', p_floor)):
            th = fit(m, y[tr], gap[tr], conf[tr], concept[tr])
            pr = np.clip(m(th, gap[te], conf[te], concept[te]), 1e-4, 1 - 1e-4)
            out[name].extend(-(y[te] * np.log(pr) + (1 - y[te]) * np.log(1 - pr)))
    return {k: float(np.mean(v)) for k, v in out.items()}


def simulate(n_people, skills_each, truth, rng):
    """SIMULATED first answers: finish dates 1 to 24 months ago, confidence 1 to 5, about 30% detail items"""
    rows = []
    for i in range(n_people):
        gap = rng.uniform(30, 730)
        for _ in range(skills_each):
            conf = rng.integers(1, 6)
            concept = int(rng.random() > 0.3)
            p = truth(gap, conf, concept)
            rows.append((i, int(rng.random() < p), gap, conf, concept))
    a = np.array(rows, dtype=float)
    return a[:, 0], a[:, 1], a[:, 2], a[:, 3], a[:, 4]


def power(rng):
    #truth with a floor: concepts keep 50%, details 15%, half-life 90 days at confidence 3
    floor_truth = lambda g, c, k: p_floor([np.log2(90), 0.4, np.log(.15 / .85), 0.0], np.array(g), np.array(c), np.array(k))
    plain_truth = lambda g, c, k: p_plain([np.log2(240), 0.4], np.array(g), np.array(c), np.array(k))
    lines = ['# SIMULATED power check for the floor curve', '',
             '**SIMULATED DATA. No people took part. This only shows how many people the comparison needs.**', '',
             'Each run makes first answers for N people with 7 skills each, fits both curves leaving one person out, '
             'and counts how often the floor curve has the lower log loss.', '',
             '| People | Truth has a floor: floor curve wins | Truth has no floor: floor curve wins |', '|---|---|---|']
    for n in (10, 20, 30):
        wins = {'floor': 0, 'plain': 0}
        runs = 20
        for truth_name, truth in (('floor', floor_truth), ('plain', plain_truth)):
            for _ in range(runs):
                people, y, gap, conf, concept = simulate(n, 7, truth, rng)
                ll = lopo(people, y, gap, conf, concept)
                wins[truth_name] += ll['floor'] < ll['plain']
        lines.append(f'| {n} | {wins["floor"]} of {runs} | {wins["plain"]} of {runs} |')
    return '\n'.join(lines)


def load_pilot(folder):
    rows = []
    for f in os.listdir(folder):
        path = os.path.join(folder, f)
        if f.endswith(('.jsonl', '.txt')):
            for line in open(path):
                if line.strip():
                    got = json.loads(line)
                    rows.extend(got if isinstance(got, list) else [got])
        elif f in ('answer.csv', 'split.csv'):
            import pandas as pd
            rows.extend(pd.read_csv(path).to_dict('records'))
    return rows


def real(folder):
    bank = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'content', 'module_ds_v1.json')))
    kind = {it['id']: kind_of(it) for it in bank['recall_items']}
    rows = load_pilot(folder)
    split = {r['code']: r for r in rows if r.get('event') == 'split'}
    first = [r for r in rows if r.get('event') == 'answer' and str(r.get('n_before')) == '0' and r.get('kind') == 'practice']
    data = []
    for r in first:
        s = split.get(r['code'])
        if not s or not s.get('finished'):
            continue
        conf = json.loads(s['confidence']).get(r['skill'], 3)
        gap = (np.datetime64(r['ts'][:10]) - np.datetime64(s['finished'])).astype(int)
        data.append((hash(r['code']) % 100000, int(r['right']), max(gap, 1), conf, int(kind.get(r['item'], 'concept') == 'concept')))
    if len(data) < 20:
        sys.exit(f'Only {len(data)} first answers with a finish date. Wait for more pilot data.')
    a = np.array(data, dtype=float)
    people, y, gap, conf, concept = a.T
    ll = lopo(people, y, gap, conf, concept)
    th = fit(p_floor, y, gap, conf, concept)
    fd, fc = 1 / (1 + np.exp(-th[2])), 1 / (1 + np.exp(-th[3]))
    print(f'{len(y)} first answers from {len(np.unique(people))} people.')
    print(f'Leave-one-person-out log loss: plain {ll["plain"]:.3f}, floor {ll["floor"]:.3f} (lower is better).')
    print(f'Floor share that stays: detail items {fd:.0%}, concept items {fc:.0%}. Half-life at confidence 3: {2 ** th[0]:.0f} days.')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('folder', nargs='?')
    ap.add_argument('--power', action='store_true')
    a = ap.parse_args()
    if a.power:
        text = power(np.random.default_rng(11))
        os.makedirs(os.path.join(os.path.dirname(__file__), 'out'), exist_ok=True)
        open(os.path.join(os.path.dirname(__file__), 'out', 'floor_power_SIMULATED.md'), 'w').write(text)
        print(text)
    elif a.folder:
        real(a.folder)
    else:
        ap.print_help()
