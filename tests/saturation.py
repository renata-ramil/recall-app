#new-themes curve from the recoded calls, for the saturation stop rule
#usage: python3 tests/saturation.py tests/recode.csv
#recode.csv: one row per call in the order the calls happened, columns: call, then one column per code with 1 if the call raised it
#stop rule: three calls in a row with no new code, or 20 calls
import sys

import pandas as pd


def main(path):
    df = pd.read_csv(path).fillna(0)
    codes = [c for c in df.columns if c != 'call']
    seen, rows, streak, stop = set(), [], 0, None
    for _, r in df.iterrows():
        raised = {c for c in codes if int(r[c]) == 1}
        new = raised - seen
        seen |= raised
        #counting calls in a row that added nothing new
        streak = streak + 1 if not new else 0
        if streak == 3 and stop is None:
            stop = r['call']
        rows.append((r['call'], len(raised), len(new), len(seen), ', '.join(sorted(new))))
    print('| Call | Codes raised | New codes | Total so far | New |')
    print('|---|---|---|---|---|')
    for row in rows:
        print('| ' + ' | '.join(str(x) for x in row) + ' |')
    print()
    print(f'Stop rule met at {stop}.' if stop else f'Stop rule not met: last {streak} call(s) added nothing new.')


if __name__ == '__main__':
    main(sys.argv[1])
