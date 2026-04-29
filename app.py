"""
Cyber Kill Chain · Flask backend
================================
Single-user educational app per COMS 4170W HW10 spec. Renders lesson
and quiz pages from a JSON content file, and records every user
interaction to a session file on disk so the instructor can verify
that choices are being stored server-side.

The quiz is a single Final Battle (turn-based duel vs. Inu).
Avatar unlock state is persisted in a separate file (data/avatars.json)
so it survives "Start Over", matching Pokedex semantics.
"""

from __future__ import annotations

import json
import time
from datetime import datetime
from pathlib import Path

from flask import (
    Flask,
    abort,
    jsonify,
    redirect,
    render_template,
    request,
    url_for,
)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CONTENT_PATH = DATA_DIR / "content.json"
SESSION_PATH = DATA_DIR / "session.json"
AVATARS_PATH = DATA_DIR / "avatars.json"

app = Flask(__name__)


# ---------------------------------------------------------------------------
# Content + session helpers
# ---------------------------------------------------------------------------

def load_content() -> dict:
    """Lesson + quiz content. Re-read on every request so edits show up
    without restarting the server during development."""
    with CONTENT_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def empty_session() -> dict:
    return {
        "started_at": None,
        "started_at_iso": None,
        "events": [],
        "quiz_answers": {},
        "quiz_score": None,
        "quiz_completed_at": None,
    }


def load_session() -> dict:
    if not SESSION_PATH.exists():
        return empty_session()
    try:
        with SESSION_PATH.open("r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return empty_session()


def save_session(session: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with SESSION_PATH.open("w", encoding="utf-8") as f:
        json.dump(session, f, indent=2)


def record_event(session: dict, kind: str, **fields) -> None:
    session["events"].append({
        "type": kind,
        "time": time.time(),
        "time_iso": datetime.utcnow().isoformat() + "Z",
        **fields,
    })


# ---------------------------------------------------------------------------
# Avatar persistence (separate from session.json so unlocks survive reset)
# ---------------------------------------------------------------------------

def _default_avatars_state() -> dict:
    content = load_content()
    roster = content.get("avatars", {}).get("roster", [])
    default_id = content.get("avatars", {}).get("default", "neko")
    unlocked = [a["id"] for a in roster if a.get("default_unlocked")]
    if default_id not in unlocked and unlocked:
        unlocked.insert(0, default_id)
    return {"active": default_id, "unlocked": unlocked or [default_id]}


def load_avatars() -> dict:
    if not AVATARS_PATH.exists():
        state = _default_avatars_state()
        save_avatars(state)
        return state
    try:
        with AVATARS_PATH.open("r", encoding="utf-8") as f:
            state = json.load(f)
    except (json.JSONDecodeError, OSError):
        state = _default_avatars_state()
    state.setdefault("active", "neko")
    state.setdefault("unlocked", ["neko"])
    if state["active"] not in state["unlocked"]:
        state["active"] = state["unlocked"][0] if state["unlocked"] else "neko"
    return state


def save_avatars(state: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with AVATARS_PATH.open("w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def unlock_avatar(avatar_id: str) -> dict:
    state = load_avatars()
    if avatar_id and avatar_id not in state["unlocked"]:
        state["unlocked"].append(avatar_id)
        save_avatars(state)
    return state


def set_active_avatar(avatar_id: str) -> dict:
    state = load_avatars()
    if avatar_id and avatar_id in state["unlocked"]:
        state["active"] = avatar_id
        save_avatars(state)
    return state


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.context_processor
def inject_globals():
    """Make a few commonly-used pieces available in every template."""
    content = load_content()
    quiz = content.get("quiz", {})
    avatars_state = load_avatars()
    roster = content.get("avatars", {}).get("roster", [])
    active_avatar = next(
        (a for a in roster if a.get("id") == avatars_state.get("active")),
        roster[0] if roster else {"id": "neko", "name": "Neko"},
    )
    return {
        "meta": content.get("meta", {}),
        "total_lessons": len(content.get("lessons", [])),
        "total_challenges": len(quiz.get("challenges", [])),
        "avatars_state": avatars_state,
        "active_avatar": active_avatar,
    }


@app.route("/")
def home():
    content = load_content()
    return render_template(
        "home.html",
        home=content["home"],
    )


@app.route("/start", methods=["POST"])
def start():
    """Reset the session and redirect into lesson 1.
    Note: this does NOT reset avatar unlocks (they live in avatars.json)."""
    session = empty_session()
    now = time.time()
    session["started_at"] = now
    session["started_at_iso"] = datetime.utcnow().isoformat() + "Z"
    record_event(session, "session_start")
    save_session(session)
    return redirect(url_for("learn", n=1))


@app.route("/learn/<int:n>")
def learn(n: int):
    content = load_content()
    lessons = content["lessons"]
    if n < 1 or n > len(lessons):
        abort(404)

    lesson = lessons[n - 1]
    session = load_session()
    record_event(
        session,
        "lesson_enter",
        lesson=n,
        lesson_id=lesson["id"],
    )
    save_session(session)

    prev_url = url_for("learn", n=n - 1) if n > 1 else url_for("home")
    is_last = n == len(lessons)
    next_url = url_for("quiz", n=1) if is_last else url_for("learn", n=n + 1)
    next_label = "Start the Quiz →" if is_last else "Next Lesson →"

    return render_template(
        "learn.html",
        lesson=lesson,
        n=n,
        total=len(lessons),
        prev_url=prev_url,
        next_url=next_url,
        next_label=next_label,
        is_last=is_last,
    )


@app.route("/learn/<int:n>/event", methods=["POST"])
def learn_event(n: int):
    """Client-side scene interactions POST here so they get stored."""
    content = load_content()
    if n < 1 or n > len(content["lessons"]):
        abort(404)
    payload = request.get_json(silent=True) or {}
    session = load_session()
    record_event(
        session,
        "lesson_event",
        lesson=n,
        lesson_id=content["lessons"][n - 1]["id"],
        action=payload.get("action"),
        detail=payload.get("detail"),
    )
    save_session(session)
    return jsonify({"ok": True, "recorded_events": len(session["events"])})


def _grade_challenge(challenge: dict, submitted):
    """Compute (correct, total) for a single challenge given the user's
    raw submission. Returns a dict with per-item detail plus tallies so
    we can both store the breakdown and render a review on the results
    page. Unknown / missing submissions are counted as zero correct.

    The only challenge type today is `battle`. The submission shape is::

        {
          "victory": bool,
          "turns": [
            {"turn": 1, "move_id": "phish", "move_name": "Phishing Strike",
             "posture": "honeypotting", "posture_name": "Honeypotting",
             "verdict": "strong" | "neutral" | "weak" | "miss",
             "progress_added": 100, "detection_added": 5,
             "phase_cleared": true, "hit": true,
             "objective": "exfil" | "ransom" | "wipe" | null},
            ...
          ],
          "phases_cleared": int,
          "phases_total": int,
          "detection_final": int,
          "detection_max": int,
          "turns_used": int,
          "max_turns": int,
          "victory_mode": "exfil" | "ransom" | "wipe" | null,
          "defeat_mode":  "detection" | "timeout" | null
        }
    """
    ctype = challenge.get("type")

    if ctype == "battle":
        sub = submitted if isinstance(submitted, dict) else {}
        turns = sub.get("turns") or []
        victory = bool(sub.get("victory"))

        items = []
        smart_picks = 0
        for t in turns:
            verdict = t.get("verdict", "neutral")
            is_smart = verdict == "strong"
            if is_smart:
                smart_picks += 1
            items.append({
                "turn": t.get("turn"),
                "move_name": t.get("move_name"),
                "posture_name": t.get("posture_name"),
                "verdict": verdict,
                "progress_added": t.get("progress_added"),
                "detection_added": t.get("detection_added"),
                "phase_cleared": t.get("phase_cleared", False),
                "hit": t.get("hit", True),
                "objective": t.get("objective"),
                "is_correct": is_smart,
            })

        return {
            "correct": smart_picks,
            "total": max(len(turns), 1),
            "items": items,
            "victory": victory,
            "phases_cleared": sub.get("phases_cleared"),
            "phases_total": sub.get("phases_total"),
            "detection_final": sub.get("detection_final"),
            "detection_max": sub.get("detection_max"),
            "turns_used": sub.get("turns_used"),
            "max_turns": sub.get("max_turns"),
            "victory_mode": sub.get("victory_mode"),
            "defeat_mode": sub.get("defeat_mode"),
        }

    return {"correct": 0, "total": 0, "items": []}


@app.route("/quiz/<int:n>", methods=["GET", "POST"])
def quiz(n: int):
    content = load_content()
    quiz_data = content["quiz"]
    challenges = quiz_data["challenges"]
    if n < 1 or n > len(challenges):
        abort(404)

    challenge = challenges[n - 1]
    session = load_session()

    if request.method == "POST":
        raw = request.form.get("submission", "")
        try:
            submitted = json.loads(raw) if raw else None
        except json.JSONDecodeError:
            submitted = None

        grade = _grade_challenge(challenge, submitted)
        stored = {
            "challenge_id": challenge["id"],
            "type": challenge["type"],
            "submission": submitted,
            "correct": grade["correct"],
            "total": grade["total"],
        }
        if challenge["type"] == "battle":
            stored["victory"] = grade.get("victory", False)
        session.setdefault("quiz_answers", {})[str(n)] = stored

        record_event(
            session,
            "quiz_submit",
            challenge_num=n,
            challenge_id=challenge["id"],
            type=challenge["type"],
            correct=grade["correct"],
            total=grade["total"],
            victory=grade.get("victory"),
        )
        save_session(session)

        # Auto-unlock the boss avatar on victory.
        if challenge["type"] == "battle" and grade.get("victory"):
            unlock_avatar("inu")

        if n < len(challenges):
            return redirect(url_for("quiz", n=n + 1))
        return redirect(url_for("quiz_result"))

    record_event(
        session,
        "quiz_enter",
        challenge_num=n,
        challenge_id=challenge["id"],
        type=challenge["type"],
    )
    save_session(session)

    prev_url = (
        url_for("quiz", n=n - 1)
        if n > 1
        else url_for("learn", n=len(content["lessons"]))
    )
    saved = session.get("quiz_answers", {}).get(str(n), {})
    saved_submission = saved.get("submission") if isinstance(saved, dict) else None

    return render_template(
        "quiz.html",
        challenge=challenge,
        n=n,
        total=len(challenges),
        prev_url=prev_url,
        saved_submission=saved_submission,
        is_last=n == len(challenges),
    )


@app.route("/quiz/result")
def quiz_result():
    content = load_content()
    quiz_data = content["quiz"]
    challenges = quiz_data["challenges"]
    session = load_session()
    answers = session.get("quiz_answers", {})

    breakdown = []
    correct_count = 0
    total_count = 0
    victory = False
    for i, ch in enumerate(challenges, start=1):
        raw = answers.get(str(i), {})
        submission = raw.get("submission") if isinstance(raw, dict) else None
        grade = _grade_challenge(ch, submission)
        correct_count += grade["correct"]
        total_count += grade["total"]
        if grade.get("victory"):
            victory = True
        breakdown.append({
            "n": i,
            "challenge": ch,
            "correct": grade["correct"],
            "total": grade["total"],
            "entries": grade["items"],
            "victory": grade.get("victory", False),
            "phases_cleared": grade.get("phases_cleared"),
            "phases_total": grade.get("phases_total"),
            "detection_final": grade.get("detection_final"),
            "detection_max": grade.get("detection_max"),
            "turns_used": grade.get("turns_used"),
            "max_turns": grade.get("max_turns"),
            "victory_mode": grade.get("victory_mode"),
            "defeat_mode": grade.get("defeat_mode"),
        })

    # Score: fraction of "smart" picks scaled to 100, with a +20 victory
    # bonus capped at 100. A defeat caps the score at 60% no matter how
    # many strong picks you made -- you still lost the engagement.
    raw_pct = round(100 * correct_count / total_count) if total_count else 0
    if victory:
        score = min(100, raw_pct + 20)
    else:
        score = min(60, raw_pct)

    session["quiz_score"] = score
    session["quiz_completed_at"] = datetime.utcnow().isoformat() + "Z"
    record_event(
        session,
        "quiz_complete",
        score=score,
        correct=correct_count,
        total=total_count,
        victory=victory,
    )
    save_session(session)

    if victory and score >= 90:
        title = "Kill Chain Complete · Flawless Run"
        message = "You read every posture and ran the kill chain end-to-end without spooking the SOC. Cyber Inu has been added to your roster."
    elif victory:
        title = "Kill Chain Complete"
        message = "Mission accomplished — you reached the objective before the IR clock ran out. Cyber Inu has been added to your roster."
    elif score >= 50:
        title = "Caught at the Finish Line"
        message = "You walked most of the kill chain, but the SOC pieced your campaign together before the objective. Review the postures and try again from the Quiz tab."
    else:
        title = "Try Again"
        message = "Each posture has exactly one move that breaks it. Re-read the lessons, study the move list, and queue up another run."

    return render_template(
        "result.html",
        breakdown=breakdown,
        correct=correct_count,
        total=total_count,
        score=score,
        title=title,
        message=message,
        victory=victory,
    )


# ---------------------------------------------------------------------------
# Avatars page + API
# ---------------------------------------------------------------------------

@app.route("/avatars")
def avatars_page():
    content = load_content()
    roster = content.get("avatars", {}).get("roster", [])
    state = load_avatars()
    cards = []
    for a in roster:
        unlocked = a["id"] in state["unlocked"]
        cards.append({
            **a,
            "unlocked": unlocked,
            "active": a["id"] == state["active"],
        })
    return render_template(
        "avatars.html",
        cards=cards,
        state=state,
    )


@app.route("/api/avatars/select", methods=["POST"])
def api_avatars_select():
    payload = request.get_json(silent=True) or {}
    avatar_id = payload.get("id")
    state = set_active_avatar(avatar_id)
    session = load_session()
    record_event(session, "avatar_select", avatar_id=avatar_id, accepted=avatar_id == state["active"])
    save_session(session)
    return jsonify({"ok": True, "state": state})


@app.route("/api/avatars/unlock", methods=["POST"])
def api_avatars_unlock():
    payload = request.get_json(silent=True) or {}
    avatar_id = payload.get("id")
    state = unlock_avatar(avatar_id)
    return jsonify({"ok": True, "state": state})


@app.route("/api/session")
def api_session():
    """Handy for the instructor to verify that choices are actually
    being recorded server-side. Returns the full session JSON."""
    return jsonify(load_session())


if __name__ == "__main__":
    app.run(debug=True, port=5000)
