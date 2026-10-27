"""
First version of the skill-decay forgetting model.

Two parts, matching this week's plan:
  1. A hierarchical Bayesian half-life model fit on Duolingo-schema data
     (partial pooling across users and items), compared against a simple
     global-average baseline.
  2. The same model structure fit on synthetic "skill decay" data that
     mimics the real pilot use case (initial mastery from a course grade,
     decay over time, updates from practice) -- with KNOWN ground-truth
     parameters, so we can check the model actually recovers them before
     trusting it on anything real.

Real Duolingo data (settles.acl16.learning_traces.13m.csv.gz, ~361MB) lives
on Harvard Dataverse: https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/N8XJME
This sandbox can't reach that host, so part 1 runs on a schema-matched
synthetic stand-in. Swap in the real file by pointing DUOLINGO_CSV_PATH at
it -- the loader expects the exact columns Settles & Meeder (2016) published:
p_recall, timestamp, delta, user_id, learning_language, ui_language,
lexeme_id, lexeme_string, history_seen, history_correct, session_seen,
session_correct.
"""

import numpy as np
import pandas as pd
import pymc as pm
import arviz as az

RNG = np.random.default_rng(42)
DUOLINGO_CSV_PATH = "settles.acl16.learning_traces.13m.csv.gz"  # swap in the real file when you have it


# ---------------------------------------------------------------------------
# Part 1: Duolingo-schema data (real loader + synthetic stand-in)
# ---------------------------------------------------------------------------

def load_duolingo_traces(path: str) -> pd.DataFrame:
    """Loads the real Settles & Meeder (2016) learning-traces file."""
    print(f"Loading real Duolingo traces from {path} ...")
    df = pd.read_csv(path, compression="gzip")
    print(f"  loaded {len(df):,} rows, {df['user_id'].nunique():,} users, "
          f"{df['lexeme_id'].nunique():,} lexemes")
    return df


def generate_synthetic_duolingo_traces(n_users: int = 120, n_lexemes: int = 25,
                                        avg_sessions_per_pair: int = 4) -> pd.DataFrame:
    """
    Schema-matched stand-in for the real file, since this sandbox can't
    reach Harvard Dataverse. Built from a known half-life process so we
    have something plausible to validate the model against while you get
    the real file on your own machine.
    """
    print(f"Generating synthetic Duolingo-style traces "
          f"({n_users} users x {n_lexemes} lexemes) ...")

    # true per-user and per-lexeme effects on log2(half-life in days)
    user_ability = RNG.normal(0, 0.6, size=n_users)     # better learners -> longer half-life
    lexeme_difficulty = RNG.normal(0, 0.6, size=n_lexemes)  # harder words -> shorter half-life
    base_log2_halflife = 1.0  # ~2 days baseline

    rows = []
    for u in range(n_users):
        for lx in range(n_lexemes):
            n_sessions = RNG.poisson(avg_sessions_per_pair) + 1
            history_seen, history_correct = 0, 0
            t = 0.0
            for _ in range(n_sessions):
                delta_days = RNG.exponential(2.0) + 0.05
                t += delta_days
                # strengthening: more correct history -> longer half-life, matches
                # the real HLR finding that history_correct lengthens retention
                strength = 0.15 * np.sqrt(1 + history_correct)
                log2_h = base_log2_halflife + user_ability[u] + lexeme_difficulty[lx] + strength
                halflife_days = 2 ** log2_h
                p_recall_true = 2 ** (-delta_days / halflife_days)

                session_seen = RNG.integers(1, 6)
                session_correct = RNG.binomial(session_seen, p_recall_true)

                rows.append({
                    "user_id": u, "lexeme_id": lx, "delta_days": delta_days,
                    "history_seen": history_seen, "history_correct": history_correct,
                    "session_seen": session_seen, "session_correct": session_correct,
                    "p_recall": session_correct / session_seen,
                })
                history_seen += session_seen
                history_correct += session_correct

    df = pd.DataFrame(rows)
    print(f"  generated {len(df):,} practice events")
    return df


# ---------------------------------------------------------------------------
# Part 2: simple global-average baseline (the "good" bar from the WBS)
# ---------------------------------------------------------------------------

def fit_global_average_baseline(train: pd.DataFrame) -> float:
    """One half-life for everyone, fit by least-squares on log2(implied half-life)."""
    print("Fitting global-average baseline ...")
    eps = 1e-3
    p = train["p_recall"].clip(eps, 1 - eps)
    implied_log2_h = -np.log2(p) * 0  # placeholder, replaced below
    # implied half-life from p = 2^(-delta/h)  =>  h = -delta / log2(p)
    implied_h = -train["delta_days"] / np.log2(p)
    global_halflife = np.median(implied_h.clip(0.05, 365))
    print(f"  global half-life estimate: {global_halflife:.2f} days")
    return global_halflife


def predict_baseline(test: pd.DataFrame, global_halflife: float) -> np.ndarray:
    return 2 ** (-test["delta_days"] / global_halflife)


# ---------------------------------------------------------------------------
# Part 3: hierarchical Bayesian half-life model (partial pooling)
# ---------------------------------------------------------------------------

def fit_hierarchical_halflife_model(train: pd.DataFrame, n_users: int, n_items: int,
                                     user_col: str, item_col: str,
                                     draws: int = 800, tune: int = 800) -> az.InferenceData:
    """
    log2(halflife[u, s]) = mu + user_offset[u] + skill_offset[s]
    user_offset, skill_offset ~ Normal(0, sigma_*)   <- partial pooling
    p_recall = 2^(-delta / halflife)
    session_correct ~ Binomial(session_seen, p_recall)
    """
    print(f"Building hierarchical model: {n_users} users, {n_items} items, "
          f"{len(train):,} observations ...")

    user_idx = train[user_col].to_numpy()
    item_idx = train[item_col].to_numpy()
    delta = train["delta_days"].to_numpy()
    session_seen = train["session_seen"].to_numpy()
    session_correct = train["session_correct"].to_numpy()

    with pm.Model() as model:
        mu = pm.Normal("mu", mu=1.0, sigma=1.0)
        sigma_user = pm.HalfNormal("sigma_user", sigma=1.0)
        sigma_item = pm.HalfNormal("sigma_item", sigma=1.0)

        user_offset = pm.Normal("user_offset", mu=0, sigma=sigma_user, shape=n_users)
        item_offset = pm.Normal("item_offset", mu=0, sigma=sigma_item, shape=n_items)

        log2_halflife = mu + user_offset[user_idx] + item_offset[item_idx]
        halflife = pm.Deterministic("halflife", 2 ** log2_halflife)

        p_recall = pm.Deterministic("p_recall", 2 ** (-delta / halflife))
        p_recall_clipped = pm.math.clip(p_recall, 1e-4, 1 - 1e-4)

        pm.Binomial("obs", n=session_seen, p=p_recall_clipped, observed=session_correct)

        print("Sampling (NUTS) ...")
        idata = pm.sample(draws=draws, tune=tune, chains=2, cores=2,
                           target_accept=0.9, progressbar=True, random_seed=42)

    print("Sampling done.")
    return idata


def predict_hierarchical(idata: az.InferenceData, test: pd.DataFrame,
                          user_col: str, item_col: str) -> np.ndarray:
    post = idata.posterior
    mu = post["mu"].mean().item()
    user_offset = post["user_offset"].mean(dim=["chain", "draw"]).values
    item_offset = post["item_offset"].mean(dim=["chain", "draw"]).values

    user_idx = test[user_col].to_numpy()
    item_idx = test[item_col].to_numpy()
    log2_h = mu + user_offset[user_idx] + item_offset[item_idx]
    halflife = 2 ** log2_h
    return 2 ** (-test["delta_days"].to_numpy() / halflife)


# ---------------------------------------------------------------------------
# Part 4: synthetic "skill decay" data mimicking the real pilot use case
# ---------------------------------------------------------------------------

def generate_synthetic_skill_decay_data(n_users: int = 60, n_skills: int = 12,
                                         avg_checks_per_pair: int = 5):
    """
    Mimics the actual venture: each user has a course GRADE per skill that
    sets their starting mastery, decay runs from the end of the course, and
    periodic diagnostic checks update the estimate. Ground-truth user and
    skill offsets are known here, so we can check the model recovers them.
    """
    print(f"Generating synthetic skill-decay data "
          f"({n_users} users x {n_skills} skills) ...")

    true_user_offset = RNG.normal(0, 0.5, size=n_users)
    true_skill_offset = RNG.normal(0, 0.5, size=n_skills)
    base_log2_halflife = 4.0  # ~16 days baseline before any grade/practice effect

    rows = []
    for u in range(n_users):
        for s in range(n_skills):
            grade = RNG.uniform(2.0, 4.0)  # Minerva-style 0-4 HC/LO-adjacent grade scale
            grade_effect = 0.4 * (grade - 3.0)  # better grade -> longer initial half-life

            n_checks = RNG.poisson(avg_checks_per_pair) + 1
            months_since_course = RNG.uniform(1, 18)
            practice_count = 0

            for _ in range(n_checks):
                delta_days = RNG.exponential(20.0) + 1
                strength = 0.1 * np.sqrt(practice_count)
                log2_h = (base_log2_halflife + true_user_offset[u] + true_skill_offset[s]
                          + grade_effect + strength)
                halflife_days = 2 ** log2_h
                p_recall_true = 2 ** (-delta_days / halflife_days)

                session_seen = RNG.integers(3, 8)
                session_correct = RNG.binomial(session_seen, p_recall_true)

                rows.append({
                    "user_id": u, "skill_id": s, "grade": grade,
                    "delta_days": delta_days, "months_since_course": months_since_course,
                    "session_seen": session_seen, "session_correct": session_correct,
                    "p_recall": session_correct / session_seen,
                })
                practice_count += session_seen

    df = pd.DataFrame(rows)
    print(f"  generated {len(df):,} diagnostic/practice events")
    return df, true_user_offset, true_skill_offset


def check_parameter_recovery(idata: az.InferenceData, true_user_offset, true_skill_offset):
    post = idata.posterior
    rec_user = post["user_offset"].mean(dim=["chain", "draw"]).values
    rec_skill = post["item_offset"].mean(dim=["chain", "draw"]).values

    user_corr = np.corrcoef(true_user_offset, rec_user)[0, 1]
    skill_corr = np.corrcoef(true_skill_offset, rec_skill)[0, 1]
    print(f"Parameter recovery check:")
    print(f"  true vs recovered USER offsets:  correlation = {user_corr:.3f}")
    print(f"  true vs recovered SKILL offsets: correlation = {skill_corr:.3f}")
    print(f"  (close to 1.0 means the model is recovering real structure, "
          f"not noise)")
    return user_corr, skill_corr


def check_plausibility(idata: az.InferenceData, label: str):
    """#plausibility HC: do fitted half-lives land in a sane range?"""
    halflife_days = idata.posterior["halflife"].values.flatten()
    print(f"Plausibility check ({label}):")
    print(f"  fitted half-lives: min={halflife_days.min():.2f}d, "
          f"median={np.median(halflife_days):.2f}d, max={halflife_days.max():.2f}d")
    if halflife_days.min() < 0.01 or halflife_days.max() > 3650:
        print("  WARNING: some half-lives are outside a plausible minutes-to-years "
              "range -- check for a bug before trusting this.")
    else:
        print("  within a plausible range (not minutes, not decades).")


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

def evaluate(name: str, y_true: np.ndarray, y_pred: np.ndarray):
    mae = np.mean(np.abs(y_true - y_pred))
    print(f"  {name}: MAE on held-out p_recall = {mae:.4f}")
    return mae


def train_test_split_by_row(df: pd.DataFrame, test_frac: float = 0.2):
    df = df.sample(frac=1.0, random_state=42).reset_index(drop=True)
    n_test = int(len(df) * test_frac)
    return df.iloc[n_test:].reset_index(drop=True), df.iloc[:n_test].reset_index(drop=True)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 70)
    print("PART 1: Duolingo-schema data (synthetic stand-in, real file not")
    print("reachable from this sandbox -- see DUOLINGO_CSV_PATH note above)")
    print("=" * 70)

    duo_df = generate_synthetic_duolingo_traces(n_users=120, n_lexemes=25)
    duo_train, duo_test = train_test_split_by_row(duo_df)

    global_h = fit_global_average_baseline(duo_train)
    baseline_pred = predict_baseline(duo_test, global_h)
    baseline_mae = evaluate("Global-average baseline", duo_test["p_recall"].to_numpy(), baseline_pred)

    duo_idata = fit_hierarchical_halflife_model(
        duo_train, n_users=120, n_items=25, user_col="user_id", item_col="lexeme_id",
    )
    hier_pred = predict_hierarchical(duo_idata, duo_test, "user_id", "lexeme_id")
    hier_mae = evaluate("Hierarchical partial-pooling model", duo_test["p_recall"].to_numpy(), hier_pred)

    print(f"\nResult: hierarchical model {'BEATS' if hier_mae < baseline_mae else 'does NOT beat'} "
          f"the global-average baseline ({hier_mae:.4f} vs {baseline_mae:.4f} MAE)")
    check_plausibility(duo_idata, "Duolingo-style data")

    print()
    print("=" * 70)
    print("PART 2: synthetic skill-decay data (mimics the real pilot: grade")
    print("sets initial mastery, decay over months, practice updates it)")
    print("=" * 70)

    skill_df, true_user_off, true_skill_off = generate_synthetic_skill_decay_data(
        n_users=60, n_skills=12
    )
    skill_train, skill_test = train_test_split_by_row(skill_df)

    skill_idata = fit_hierarchical_halflife_model(
        skill_train, n_users=60, n_items=12, user_col="user_id", item_col="skill_id",
    )
    skill_pred = predict_hierarchical(skill_idata, skill_test, "user_id", "skill_id")
    evaluate("Hierarchical model on skill-decay data", skill_test["p_recall"].to_numpy(), skill_pred)

    check_parameter_recovery(skill_idata, true_user_off, true_skill_off)
    check_plausibility(skill_idata, "skill-decay data")

    print()
    print("Done. Both parts ran end to end.")
