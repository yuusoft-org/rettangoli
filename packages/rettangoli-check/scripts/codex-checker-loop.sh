#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
ITERATIONS="${ITERATIONS:-50}"
MODEL="${MODEL:-}"
SANDBOX_MODE="${SANDBOX_MODE:-workspace-write}"
RUN_ID="${RUN_ID:-$(date +%Y%m%d-%H%M%S)}"
LOG_DIR="${LOG_DIR:-$ROOT_DIR/.codex-runs/checker-loop-$RUN_ID}"
EVAL_CMD="${EVAL_CMD:-bun run --cwd packages/rettangoli-check test:scenarios}"
DRY_RUN="${DRY_RUN:-0}"
JOURNAL_FILE="${JOURNAL_FILE:-$ROOT_DIR/packages/rettangoli-check/.codex-journal.md}"

mkdir -p "$LOG_DIR"
mkdir -p "$(dirname "$JOURNAL_FILE")"

if [[ ! -f "$JOURNAL_FILE" ]]; then
  cat > "$JOURNAL_FILE" <<'JOURNAL'
# Codex Checker Journal

This file is append-only.
Each iteration should add:
- iteration number and timestamp
- what changed
- blockers
- next step hypothesis
JOURNAL
fi

FOCI=(
  "Improve YAHTML attr coverage while keeping false positives low."
  "Strengthen cross-file symbol checks for handlers/actions/methods."
  "Improve parser correctness for tricky YAML list/selector lines."
  "Tighten diagnostics quality: stable codes, clear messages, file:line precision."
  "Reduce complexity in registry generation while preserving behavior."
  "Increase reliability of schema and listener contract checks."
  "Refactor for simplicity: delete dead branches and consolidate helpers."
  "Add or improve scenario tests before changing checker logic."
  "Make CLI behavior predictable: flags, exits, and output format."
  "Prioritize maintainability: minimal code, maximal signal."
)

summary_file="$LOG_DIR/summary.tsv"
printf "iter\tcodex_exit\teval_exit\tpass_count\tnotes\n" > "$summary_file"

echo "[loop] ROOT_DIR=$ROOT_DIR"
echo "[loop] ITERATIONS=$ITERATIONS"
echo "[loop] MODEL=${MODEL:-<default-from-codex-config>}"
echo "[loop] SANDBOX_MODE=$SANDBOX_MODE"
echo "[loop] LOG_DIR=$LOG_DIR"
echo "[loop] EVAL_CMD=$EVAL_CMD"
echo "[loop] DRY_RUN=$DRY_RUN"
echo "[loop] JOURNAL_FILE=$JOURNAL_FILE"

echo "[loop] Starting synchronous Codex loop..."

for ((i=1; i<=ITERATIONS; i++)); do
  focus_index=$(( (i - 1) % ${#FOCI[@]} ))
  focus="${FOCI[$focus_index]}"

  prompt_file="$LOG_DIR/iter-$(printf "%02d" "$i")-prompt.md"
  codex_log="$LOG_DIR/iter-$(printf "%02d" "$i")-codex.log"
  last_msg="$LOG_DIR/iter-$(printf "%02d" "$i")-last-message.txt"
  eval_log="$LOG_DIR/iter-$(printf "%02d" "$i")-eval.log"

  prev_eval_tail="No previous evaluation log."
  journal_tail="No journal history yet."
  if (( i > 1 )); then
    prev_eval="$LOG_DIR/iter-$(printf "%02d" "$((i - 1))")-eval.log"
    if [[ -f "$prev_eval" ]]; then
      prev_eval_tail="$(tail -n 40 "$prev_eval")"
    fi
  fi
  if [[ -f "$JOURNAL_FILE" ]]; then
    journal_tail="$(tail -n 60 "$JOURNAL_FILE")"
  fi

  cat > "$prompt_file" <<PROMPT
You are iteration $i of $ITERATIONS for improving @rettangoli/check.

Primary objective:
- Make the checker more powerful, simple, and reliable.
- Keep behavior deterministic and well-tested.

Hard constraints:
- Work only in this repository.
- Prioritize small, high-confidence changes.
- Prefer adding/updating scenario tests before changing logic.
- Preserve existing passing behavior unless explicitly improved and covered by tests.

Current focus for this iteration:
- $focus

Important project context:
- Checker package: packages/rettangoli-check
- Scenario tests: packages/rettangoli-check/test/scenarios
- Test runner: packages/rettangoli-check/test/run-scenarios.mjs
- Progress journal (append every iteration): $JOURNAL_FILE

Required end-of-iteration actions:
1) Run the scenario suite.
2) Ensure changes are coherent and minimal.
3) Append a new journal entry to $JOURNAL_FILE with:
   - iteration number and timestamp
   - completed changes
   - blockers encountered
   - next-step hypothesis
4) In the final response, include:
   - what changed
   - why it improves reliability/simplicity
   - scenario test result

Previous iteration evaluation tail:
\
$prev_eval_tail

Recent journal tail:
\
$journal_tail
PROMPT

  echo "[loop] Iteration $i/$ITERATIONS: focus='$focus'"

  codex_exit=0
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[loop] DRY_RUN=1, skipping codex exec" | tee "$codex_log"
  else
    cmd=(codex exec --full-auto --sandbox "$SANDBOX_MODE" --cd "$ROOT_DIR" --output-last-message "$last_msg" "-")
    if [[ -n "$MODEL" ]]; then
      cmd+=( -m "$MODEL" )
    fi

    set +e
    "${cmd[@]}" < "$prompt_file" > "$codex_log" 2>&1
    codex_exit=$?
    set -e
  fi

  eval_exit=0
  set +e
  bash -lc "$EVAL_CMD" > "$eval_log" 2>&1
  eval_exit=$?
  set -e

  pass_count="0"
  if [[ -f "$eval_log" ]]; then
    pass_count="$(grep -c '^PASS ' "$eval_log" || true)"
  fi

  notes="ok"
  if [[ "$codex_exit" -ne 0 ]]; then
    notes="codex_failed"
  elif [[ "$eval_exit" -ne 0 ]]; then
    notes="eval_failed"
  fi

  printf "%s\t%s\t%s\t%s\t%s\n" "$i" "$codex_exit" "$eval_exit" "$pass_count" "$notes" >> "$summary_file"

  {
    echo
    echo "## Iteration $i - $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    echo "- focus: $focus"
    echo "- codex_exit: $codex_exit"
    echo "- eval_exit: $eval_exit"
    echo "- pass_count: $pass_count"
    echo "- notes: $notes"
    echo
    echo "### Last Codex Message (tail)"
    if [[ -s "$last_msg" ]]; then
      tail -n 80 "$last_msg"
    else
      echo "(no captured last message)"
    fi
    echo
    echo "### Eval Log (tail)"
    if [[ -s "$eval_log" ]]; then
      tail -n 40 "$eval_log"
    else
      echo "(no eval log)"
    fi
  } >> "$JOURNAL_FILE"

  echo "[loop] Iteration $i done: codex_exit=$codex_exit eval_exit=$eval_exit pass_count=$pass_count notes=$notes"
done

echo "[loop] Finished. Summary: $summary_file"
cat "$summary_file"
