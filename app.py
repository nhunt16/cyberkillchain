"""
Cyber Kill Chain · Flask backend
================================
Single-user educational app per COMS 4170W HW10 spec. Renders lesson
and quiz pages from a JSON content file, and records every user
interaction to a session file on disk so the instructor can verify
that choices are being stored server-side.
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
# Routes
# ---------------------------------------------------------------------------

@app.context_processor
def inject_globals():
    """Make a few commonly-used pieces available in every template."""
    content = load_content()
    quiz = content.get("quiz", {})
    return {
        "meta": content.get("meta", {}),
        "total_lessons": len(content.get("lessons", [])),
        "total_challenges": len(quiz.get("challenges", [])),
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
    """Reset the session and redirect into lesson 1."""
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


def _grade_challenge(challenge: dict, submitted, correct_order):
    """Compute (correct, total) for a single challenge given the user's
    raw submission. Returns a dict with per-item detail plus tallies so
    we can both store the breakdown and render a review on the results
    page. Unknown / missing submissions are counted as zero correct."""
    ctype = challenge["type"]

    if ctype == "order":
        submitted_list = submitted if isinstance(submitted, list) else []
        items = []
        correct = 0
        for i, expected in enumerate(correct_order):
            actual = submitted_list[i] if i < len(submitted_list) else None
            ok = actual == expected
            if ok:
                correct += 1
            items.append({"expected": expected, "actual": actual, "is_correct": ok})
        return {"correct": correct, "total": len(correct_order), "items": items}

    if ctype == "match":
        submitted_map = submitted if isinstance(submitted, dict) else {}
        items = []
        correct = 0
        for ev in challenge["events"]:
            actual = submitted_map.get(ev["id"])
            ok = actual == ev["phase"]
            if ok:
                correct += 1
            items.append({
                "event": ev["text"],
                "expected": ev["phase"],
                "actual": actual,
                "is_correct": ok,
            })
        return {"correct": correct, "total": len(challenge["events"]), "items": items}

    if ctype == "defend":
        submitted_map = submitted if isinstance(submitted, dict) else {}
        items = []
        correct = 0
        for idx, rd in enumerate(challenge["rounds"]):
            picked_id = submitted_map.get(str(idx)) or submitted_map.get(idx)
            picked = next((o for o in rd["options"] if o["id"] == picked_id), None)
            right = next((o for o in rd["options"] if o.get("correct")), None)
            ok = bool(picked and picked.get("correct"))
            if ok:
                correct += 1
            items.append({
                "phase": rd["phase"],
                "picked": picked["text"] if picked else None,
                "correct_option": right["text"] if right else None,
                "is_correct": ok,
            })
        return {"correct": correct, "total": len(challenge["rounds"]), "items": items}

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

        grade = _grade_challenge(challenge, submitted, quiz_data["correct_order"])
        session.setdefault("quiz_answers", {})[str(n)] = {
            "challenge_id": challenge["id"],
            "type": challenge["type"],
            "submission": submitted,
            "correct": grade["correct"],
            "total": grade["total"],
        }
        record_event(
            session,
            "quiz_submit",
            challenge_num=n,
            challenge_id=challenge["id"],
            type=challenge["type"],
            correct=grade["correct"],
            total=grade["total"],
        )
        save_session(session)
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
        correct_order=quiz_data["correct_order"],
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
    for i, ch in enumerate(challenges, start=1):
        raw = answers.get(str(i), {})
        submission = raw.get("submission") if isinstance(raw, dict) else None
        grade = _grade_challenge(ch, submission, quiz_data["correct_order"])
        correct_count += grade["correct"]
        total_count += grade["total"]
        breakdown.append({
            "n": i,
            "challenge": ch,
            "correct": grade["correct"],
            "total": grade["total"],
            "entries": grade["items"],
        })

    score = round(100 * correct_count / total_count) if total_count else 0

    session["quiz_score"] = score
    session["quiz_completed_at"] = datetime.utcnow().isoformat() + "Z"
    record_event(
        session,
        "quiz_complete",
        score=score,
        correct=correct_count,
        total=total_count,
    )
    save_session(session)

    if score >= 90:
        title = "Outstanding!"
        message = "You clearly understand the Cyber Kill Chain. You'd make a great security analyst."
    elif score >= 70:
        title = "Great Work!"
        message = "You've grasped the key concepts. Review the phases you missed and try again."
    elif score >= 50:
        title = "Getting There"
        message = "You understand the basics but some phases tripped you up. Walk through the lessons and try again."
    else:
        title = "Keep Learning"
        message = "Review the lessons above — each one walks through a real attack technique for its phase."

    return render_template(
        "result.html",
        breakdown=breakdown,
        correct=correct_count,
        total=total_count,
        score=score,
        title=title,
        message=message,
    )


@app.route("/api/session")
def api_session():
    """Handy for the instructor to verify that choices are actually
    being recorded server-side. Returns the full session JSON."""
    return jsonify(load_session())


if __name__ == "__main__":
    app.run(debug=True, port=5000)
