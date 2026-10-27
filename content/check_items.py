"""
Two-model check for the content bank.

Model A wrote the items (here: hand-written by Renata, author="hand").
Model B solves each item blind, with no key, and flags problems. Any flag
rejects the item until a human fixes it. Every verdict is written back to
the bank and to content/review_log.csv so the midterm PDF can show it.

Usage:
  export ANTHROPIC_API_KEY=...        (or OPENAI_API_KEY with --provider openai)
  python3 check_items.py              # checks every unchecked item
  python3 check_items.py --all        # re-checks everything
  python3 check_items.py --dry-run    # prints the prompts, calls nothing

The checker prompt asks for a JSON verdict:
  {"answer": "B", "ambiguous": false, "weak_distractors": [], "level_ok": true, "notes": "..."}
An item passes when answer == key, ambiguous is false, weak_distractors is
empty and level_ok is true.
"""
import argparse
import csv
import json
import os
import sys
import time
from pathlib import Path

BANK = Path(__file__).parent / "module_ds_v1.json"
LOG = Path(__file__).parent / "review_log.csv"

CHECK_PROMPT = """You are reviewing one practice item for a data science refresher app aimed at recent graduates.
Solve it yourself first, then judge it. Do not assume any option is correct.

Topic: {topic}
Format: {fmt}
Level: {level} (1 = recall of a concept, 2 = read output or choose a method)
{code_block}
Question: {stem}
Options:
{options}

Return only JSON with these keys:
- "answer": the letter you believe is correct
- "ambiguous": true if more than one option could be defended as correct
- "weak_distractors": list of option letters that no reasonable learner would pick
- "level_ok": true if the difficulty matches the stated level
- "notes": one or two sentences on anything wrong (facts, wording, missing context)
"""


def render(item):
    opts = "\n".join(f"{k}. {v}" for k, v in item["options"].items())
    code_block = f"Code:\n{item['code']}\n" if item.get("code") else ""
    return CHECK_PROMPT.format(topic=item["topic"], fmt=item["format"], level=item["level"],
                               code_block=code_block, stem=item["stem"], options=opts)


def call_anthropic(prompt):
    import anthropic  # pip install anthropic
    client = anthropic.Anthropic()
    msg = client.messages.create(model="claude-sonnet-4-5", max_tokens=400,
                                 messages=[{"role": "user", "content": prompt}])
    return msg.content[0].text


def call_openai(prompt):
    from openai import OpenAI  # pip install openai
    client = OpenAI()
    r = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role": "user", "content": prompt}])
    return r.choices[0].message.content


def parse_verdict(text):
    start, end = text.find("{"), text.rfind("}")
    return json.loads(text[start:end + 1])


def verdict_passes(v, key):
    return (v.get("answer") == key and not v.get("ambiguous") and not v.get("weak_distractors")
            and v.get("level_ok", True))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--provider", default="anthropic", choices=["anthropic", "openai"])
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    bank = json.loads(BANK.read_text())
    items = bank["recall_items"]
    todo = [it for it in items if args.all or it.get("checker_verdict") is None]
    print(f"{len(todo)} items to check")
    call = call_anthropic if args.provider == "anthropic" else call_openai

    new_log = not LOG.exists()
    with LOG.open("a", newline="") as f:
        w = csv.writer(f)
        if new_log:
            w.writerow(["item_id", "checked_at", "checker", "checker_answer", "key", "ambiguous",
                        "weak_distractors", "level_ok", "pass", "notes"])
        for n, it in enumerate(todo, 1):
            prompt = render(it)
            if args.dry_run:
                print(f"--- {it['id']} ---\n{prompt}\n")
                continue
            try:
                v = parse_verdict(call(prompt))
            except Exception as e:  # noqa: BLE001
                print(f"[{n}/{len(todo)}] {it['id']}: checker error {e}")
                continue
            ok = verdict_passes(v, it["key"])
            it["checker_verdict"] = "pass" if ok else "flag"
            it["checker_notes"] = v.get("notes", "")
            w.writerow([it["id"], time.strftime("%Y-%m-%d %H:%M"), args.provider, v.get("answer"),
                        it["key"], v.get("ambiguous"), ";".join(v.get("weak_distractors", [])),
                        v.get("level_ok"), ok, v.get("notes", "")])
            print(f"[{n}/{len(todo)}] {it['id']}: {'pass' if ok else 'FLAG'}  checker={v.get('answer')} key={it['key']}")
            time.sleep(0.5)

    if not args.dry_run:
        BANK.write_text(json.dumps(bank, indent=2))
        n_pass = sum(1 for it in items if it.get("checker_verdict") == "pass")
        n_flag = sum(1 for it in items if it.get("checker_verdict") == "flag")
        print(f"done: {n_pass} pass, {n_flag} flagged, {len(items) - n_pass - n_flag} unchecked")
        print(f"log: {LOG}")


if __name__ == "__main__":
    sys.exit(main())
