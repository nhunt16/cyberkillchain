# Cyber Kill Chain · Educational Module (Flask)

COMS 4170W · HW 10 · An interactive, multi-page Flask web app that
teaches students the five phases of the Cyber Kill Chain.

## Stack

- **Backend:** Flask 3 (Python 3.11+)
- **Frontend:** HTML, CSS, jQuery 3.7, Bootstrap 5.3, vanilla JS
- **Content:** Data-driven from `data/content.json`
- **Storage:** Single-user session persisted to `data/session.json`

## Routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/` | GET | Home screen with **Begin Learning** button |
| `/start` | POST | Resets the session, redirects to `/learn/1` |
| `/learn/<n>` | GET | Renders lesson *n* (1–7); records a `lesson_enter` event |
| `/learn/<n>/event` | POST | Records an interaction event from the client (scene clicks, etc.) |
| `/quiz/<n>` | GET | Renders quiz question *n* (1–8) |
| `/quiz/<n>` | POST | Saves the user's answer, advances to the next question or to the result page |
| `/quiz/result` | GET | Scores every answer and renders the review screen |
| `/api/session` | GET | Dev-only JSON dump of the current session (useful for verifying that choices are being recorded) |

## Lessons

1. The Framework (kill chain overview)
2. Phase 1 · Reconnaissance
3. Phase 2 · Arm & Deliver
4. Phase 3 · Initial Compromise
5. Phase 4 · Escalate Privileges
6. Phase 5 · Exfiltration
7. Case Study · MGM Resorts Breach (2023)

## Data model

```
HW 10/
├── app.py                  # Flask app & routes
├── requirements.txt
├── data/
│   ├── content.json        # All lesson copy + quiz questions (source of truth)
│   └── session.json        # Runtime: user's events, answers, and score
├── static/
│   ├── css/style.css       # Dark theme + Bootstrap overlay
│   ├── js/site.js          # Shared page-level utilities (jQuery)
│   ├── js/scenes.js        # Interactive scenes per lesson page
│   ├── js/mascot.js        # Neko narrator (vanilla)
│   └── assets/*.png        # Mascot poses
└── templates/
    ├── base.html
    ├── home.html
    ├── learn.html
    ├── quiz.html
    ├── result.html
    └── partials/           # One scene partial per lesson
        ├── stepper.html
        ├── scene_framework.html
        ├── scene_recon.html
        ├── scene_armdeliver.html
        ├── scene_compromise.html
        ├── scene_escalate.html
        ├── scene_exfil.html
        └── scene_casestudy.html
```

## Running locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

python app.py
# → Flask is now serving on http://127.0.0.1:5000
```

Visit `http://127.0.0.1:5000`, click **Begin Learning**, and walk
through the lessons. The backend records every page entry, every
lesson-scene click, and every quiz answer into `data/session.json`.

To confirm data is actually being stored server-side, open
`http://127.0.0.1:5000/api/session` at any point.

## Spec checklist

- [x] Flask backend + HTML / JS / jQuery / Bootstrap frontend
- [x] Home screen with a Start button (`POST /start` clears the session and begins a new run)
- [x] Backend stores user choices on every page (quiz answers, lesson-enter timestamps, interactive scene clicks)
- [x] Content driven by `data/content.json`, not hard-coded in the templates
- [x] Four+ routes: `/`, `/learn/<n>`, `/quiz/<n>`, `/quiz/result`
- [x] Each page shows data, includes instructions, records user data, and advances
- [x] Quiz returns a score based on correct/incorrect answers
- [x] Single-user assumption (one `session.json` file on disk)

## Credit

The Cyber Kill Chain framework was developed by Lockheed Martin in
2011. Content here is adapted for educational purposes.
