#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
ITERATIONS="${ITERATIONS:-120}"
MODEL="${MODEL:-gpt-5.3-codex}"
REASONING_EFFORT="${REASONING_EFFORT:-high}"
SANDBOX_MODE="${SANDBOX_MODE:-workspace-write}"
RUN_ID="${RUN_ID:-$(date +%Y%m%d-%H%M%S)}"
LOG_DIR="${LOG_DIR:-$ROOT_DIR/.codex-runs/compiler-loop-$RUN_ID}"
DRY_RUN="${DRY_RUN:-0}"
MAX_CONSECUTIVE_CODEX_FAILURES="${MAX_CONSECUTIVE_CODEX_FAILURES:-5}"
CODEX_MAX_ATTEMPTS_PER_ITERATION="${CODEX_MAX_ATTEMPTS_PER_ITERATION:-3}"
CODEX_RETRY_BACKOFF_SECONDS="${CODEX_RETRY_BACKOFF_SECONDS:-20}"
RESUME_SUMMARY_IF_EXISTS="${RESUME_SUMMARY_IF_EXISTS:-1}"

ROADMAP_FILE="${ROADMAP_FILE:-$ROOT_DIR/packages/rettangoli-check/docs/full-compiler-platform-roadmap.md}"
END_STATE_FILE="${END_STATE_FILE:-$ROOT_DIR/packages/rettangoli-check/docs/full-compiler-platform-end-state.md}"
JOURNAL_FILE="${JOURNAL_FILE:-$ROOT_DIR/packages/rettangoli-check/.codex-compiler-journal.md}"

EVAL_CMD="${EVAL_CMD:-bun run --cwd packages/rettangoli-check test:scenarios}"

mkdir -p "$LOG_DIR"
mkdir -p "$(dirname "$JOURNAL_FILE")"

if [[ ! -f "$ROADMAP_FILE" ]]; then
  echo "[loop] missing roadmap file: $ROADMAP_FILE" >&2
  exit 1
fi

if [[ ! -f "$END_STATE_FILE" ]]; then
  echo "[loop] missing end-state file: $END_STATE_FILE" >&2
  exit 1
fi

if [[ ! -f "$JOURNAL_FILE" ]]; then
  cat > "$JOURNAL_FILE" <<'JOURNAL'
# Codex Full Compiler Journal

Append-only log per iteration.
Each entry must include:
- iteration and timestamp
- roadmap items started/completed
- files changed
- tests run and outcomes
- blockers and next-step hypothesis
JOURNAL
fi

summary_file="$LOG_DIR/summary.tsv"
if [[ ! -f "$summary_file" ]]; then
  printf "iter\tcodex_exit\teval_exit\tpass_count\topen_items\tnotes\n" > "$summary_file"
fi

start_iteration=1
if [[ "$RESUME_SUMMARY_IF_EXISTS" == "1" && -f "$summary_file" ]]; then
  last_recorded_iter="$(awk 'NR>1{iter=$1} END{print iter+0}' "$summary_file")"
  if [[ "$last_recorded_iter" -ge 1 ]]; then
    start_iteration=$((last_recorded_iter + 1))
  fi
fi

echo "[loop] ROOT_DIR=$ROOT_DIR"
echo "[loop] ITERATIONS=$ITERATIONS"
echo "[loop] MODEL=$MODEL"
echo "[loop] REASONING_EFFORT=$REASONING_EFFORT"
echo "[loop] SANDBOX_MODE=$SANDBOX_MODE"
echo "[loop] LOG_DIR=$LOG_DIR"
echo "[loop] ROADMAP_FILE=$ROADMAP_FILE"
echo "[loop] END_STATE_FILE=$END_STATE_FILE"
echo "[loop] EVAL_CMD=$EVAL_CMD"
echo "[loop] DRY_RUN=$DRY_RUN"
echo "[loop] JOURNAL_FILE=$JOURNAL_FILE"
echo "[loop] MAX_CONSECUTIVE_CODEX_FAILURES=$MAX_CONSECUTIVE_CODEX_FAILURES"
echo "[loop] CODEX_MAX_ATTEMPTS_PER_ITERATION=$CODEX_MAX_ATTEMPTS_PER_ITERATION"
echo "[loop] CODEX_RETRY_BACKOFF_SECONDS=$CODEX_RETRY_BACKOFF_SECONDS"
echo "[loop] RESUME_SUMMARY_IF_EXISTS=$RESUME_SUMMARY_IF_EXISTS"
echo "[loop] start_iteration=$start_iteration"

echo "[loop] Starting full-compiler Codex loop..."

consecutive_codex_failures=0

if [[ "$start_iteration" -gt "$ITERATIONS" ]]; then
  echo "[loop] Nothing to run: start_iteration ($start_iteration) > ITERATIONS ($ITERATIONS)"
  echo "[loop] Existing summary: $summary_file"
  cat "$summary_file"
  exit 0
fi

for ((i=start_iteration; i<=ITERATIONS; i++)); do
  prompt_file="$LOG_DIR/iter-$(printf "%03d" "$i")-prompt.md"
  codex_log="$LOG_DIR/iter-$(printf "%03d" "$i")-codex.log"
  last_msg="$LOG_DIR/iter-$(printf "%03d" "$i")-last-message.txt"
  eval_log="$LOG_DIR/iter-$(printf "%03d" "$i")-eval.log"

  open_items="$(rg -n "^- \\[ \\]" "$ROADMAP_FILE" | wc -l | tr -d ' ')"
  open_items_preview="$(rg -n "^- \\[ \\]" "$ROADMAP_FILE" | head -n 25 || true)"
  critical_preview="$(rg -n "^- \\[ \\] CP" "$ROADMAP_FILE" || true)"
  journal_tail="$(tail -n 80 "$JOURNAL_FILE" 2>/dev/null || true)"

  cat > "$prompt_file" <<PROMPT
You are iteration $i of $ITERATIONS for the Rettangoli full compiler platform program.

North star:
- Implement toward the full end-state architecture in:
  - $END_STATE_FILE
- Execute and update the master checklist in:
  - $ROADMAP_FILE

Operating mode:
- Do real code/docs/test changes in this repository.
- Work on highest-value unchecked roadmap items first, prioritizing critical-path items.
- Prefer coherent vertical slices that produce working, tested capability.
- Keep semantics deterministic and avoid fragile heuristics.

Hard constraints:
- Do not mark roadmap items complete unless implementation and tests substantiate completion.
- If an item is started but incomplete, mark it as [/].
- Keep append-only progress in:
  - $JOURNAL_FILE
- Run tests relevant to your changes.

Mandatory end-of-iteration actions:
1) Update $ROADMAP_FILE statuses honestly ([ ], [/], [x], [-]).
2) Append a journal entry in $JOURNAL_FILE with:
   - iteration + UTC timestamp
   - roadmap items touched
   - files changed
   - tests run + results
   - blockers + next hypothesis
3) Run at least this evaluation command:
   - $EVAL_CMD
4) In final response, include:
   - what was completed
   - what is in progress
   - exact tests and outcomes

Current open roadmap item count: $open_items

Top open items (preview):
$open_items_preview

Critical path open items:
$critical_preview

Recent journal tail:
$journal_tail
PROMPT

  echo "[loop] Iteration $i/$ITERATIONS (open_items=$open_items)"

  codex_exit=0
  codex_failure_kind=""
  codex_attempts=1
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[loop] DRY_RUN=1, skipping codex exec" | tee "$codex_log"
  else
    cmd=(
      codex exec
      --full-auto
      --sandbox "$SANDBOX_MODE"
      --cd "$ROOT_DIR"
      --output-last-message "$last_msg"
      -m "$MODEL"
      -c "model_reasoning_effort=\"$REASONING_EFFORT\""
      -
    )

    : > "$codex_log"
    while (( codex_attempts <= CODEX_MAX_ATTEMPTS_PER_ITERATION )); do
      attempt_log="$LOG_DIR/iter-$(printf "%03d" "$i")-codex-attempt-$codex_attempts.log"
      set +e
      "${cmd[@]}" < "$prompt_file" > "$attempt_log" 2>&1
      codex_exit=$?
      set -e

      {
        echo
        echo "===== CODEX ATTEMPT $codex_attempts/$CODEX_MAX_ATTEMPTS_PER_ITERATION (exit=$codex_exit) ====="
        cat "$attempt_log"
      } >> "$codex_log"

      if [[ "$codex_exit" -eq 0 ]]; then
        codex_failure_kind=""
        break
      fi

      if rg -qi "usage limit|purchase more credits|try again at" "$attempt_log"; then
        codex_failure_kind="quota"
        break
      fi

      if rg -qi "stream disconnected before completion|failed to queue rollout items: channel closed|error sending request for url|Reconnecting... [0-9]+/5|Failed to shutdown rollout recorder" "$attempt_log"; then
        codex_failure_kind="transient"
        if (( codex_attempts < CODEX_MAX_ATTEMPTS_PER_ITERATION )); then
          sleep_seconds=$((CODEX_RETRY_BACKOFF_SECONDS * codex_attempts))
          echo "[loop] Iteration $i: transient codex failure on attempt $codex_attempts; retrying in ${sleep_seconds}s..."
          sleep "$sleep_seconds"
          codex_attempts=$((codex_attempts + 1))
          continue
        fi
        break
      fi

      codex_failure_kind="fatal"
      break
    done
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
    if [[ "$codex_failure_kind" == "quota" ]]; then
      notes="codex_failed_quota"
    elif [[ "$codex_failure_kind" == "transient" ]]; then
      notes="codex_failed_transient"
    elif [[ "$codex_failure_kind" == "fatal" ]]; then
      notes="codex_failed_fatal"
    else
      notes="codex_failed"
    fi
    consecutive_codex_failures=$((consecutive_codex_failures + 1))
  elif [[ "$eval_exit" -ne 0 ]]; then
    notes="eval_failed"
    consecutive_codex_failures=0
  else
    consecutive_codex_failures=0
  fi

  open_items_after="$(rg -n "^- \\[ \\]" "$ROADMAP_FILE" | wc -l | tr -d ' ')"
  printf "%s\t%s\t%s\t%s\t%s\t%s\n" "$i" "$codex_exit" "$eval_exit" "$pass_count" "$open_items_after" "$notes" >> "$summary_file"

  {
    echo
    echo "## Loop Iteration $i - $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    echo "- codex_exit: $codex_exit"
    echo "- eval_exit: $eval_exit"
    echo "- pass_count: $pass_count"
    echo "- open_items_after: $open_items_after"
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

  echo "[loop] Iteration $i done: codex_exit=$codex_exit eval_exit=$eval_exit pass_count=$pass_count open_items=$open_items_after notes=$notes attempts=$codex_attempts"

  if [[ "$codex_failure_kind" == "quota" ]]; then
    echo "[loop] Stopping early: Codex usage quota reached."
    echo "[loop] Resume later with same LOG_DIR to continue from summary."
    break
  fi

  if [[ "$consecutive_codex_failures" -ge "$MAX_CONSECUTIVE_CODEX_FAILURES" ]]; then
    echo "[loop] Stopping early after $consecutive_codex_failures consecutive codex failures."
    echo "[loop] Check recent iter-*-codex.log for quota/network/auth errors before resuming."
    break
  fi
done

echo "[loop] Finished. Summary: $summary_file"
cat "$summary_file"
