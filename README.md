# Interval Timer App

A comprehensive, modern interval timer application tailored for physical therapy, mobility routines, and workouts. This application allows you to create detailed workout plans consisting of multiple exercises with configurable work and rest intervals.

![Workout Screen](assets/screenshot.png)

## Features

- **Modern Dark-Themed UI**: Mobile-first responsive design with toast notifications and fluid animations.
- **Custom Workout Plans & Exercises**:
  - Configure name, notes, sets, reps, work time, rest time between reps, and rest time between sets.
  - **Two-Sided / Unilateral Exercise Support**: Automatically alternates between **Left Side** and **Right Side** with switch cues.
  - **Exercise Reordering & Duplication**: Move exercises up/down and clone exercises with one click.
- **Media & Preview System**:
  - **Clickable Media Lightbox**: Click any exercise thumbnail in the plan editor or workout screen to view full-resolution diagrams, image carousels with multi-image navigation, or YouTube video embeds.
  - Uncropped image containment (`object-fit: contain`) so posture diagrams are never cut off.
  - Automatically fetches default thumbnails for YouTube links.
- **Timer & Workout Engine**:
  - **Animated Circular SVG Countdown Ring**: Real-time smooth circular timer with phase color cues (Amber for Prepare, Green for Work, Red for Rest).
  - **Overall Progress Tracking**: Top progress bar and `Exercise X of Y` indicator showing total workout progress.
  - **Skip Exercise**: Instantly jump to the next exercise during a workout.
  - **Fullscreen Mode**: 1-tap dedicated distraction-free timer display on mobile and desktop.
- **Audio, Voice & Haptics**:
  - **Text-To-Speech (TTS) Prompts**: Customizable audio announcements (*"3-2-1 Go"*, *"Rest"*, *"Left side first"*, *"Switch sides"*).
  - **Configurable Settings**: Customize voice prompt level (Full, Minimal, Muted), speech speed ($0.8\times - 1.4\times$), audio beeps, and mobile haptic vibration.
- **Analytics & Motivation**:
  - **Activity Heatmap**: 30-day visual contribution grid tracking daily workout frequency.
  - **Streak & Stats Tracking**: Tracks total completions, current day streaks, and history stored in `data/stats.yml`.
- **Data Management & Sharing**:
  - **Preset Routine Library**: One-click import for curated templates (*Shoulder & Neck PT*, *Core & Planks*, *Desk Ergonomics*, *7-Min HIIT*).
  - **File Export & Import**: Download and upload plans as `.yml` or `.json` files for easy backup and cross-device sync.
  - **In-App YAML Editor**: Direct raw YAML editing on the dashboard.
- **Pain Level & PT Notes Tracker**:
  - Automatically logs post-workout pain levels on a 0–10 scale with emoji indicators and optional notes.
  - Interactive **Pain Trend Sparkline Chart** in the Stats modal to track recovery over time.
- **Hands-Free Voice Recognition Commands**:
  - Use voice commands (*"Pause"*, *"Resume"*, *"Next"*, *"Back"*, *"Skip"*) with live listening HUD for floor or mat exercises.
- **Picture-in-Picture (PiP) Floating Timer**:
  - Float a live countdown window over your desktop/phone while browsing other apps or watching videos.
- **PWA & Offline Support**:
  - Installable as a Progressive Web App (PWA).
  - Uses the **Screen Wake Lock API** to keep your display awake during workouts.
  - Runtime media caching for offline availability of exercise images.

## Keyboard Shortcuts (Workout View)

| Key | Action |
| --- | --- |
| <kbd>Space</kbd> | Toggle Play / Pause |
| <kbd>&rarr;</kbd> | Next Phase / Step |
| <kbd>&larr;</kbd> | Previous Phase / Step |
| <kbd>Esc</kbd> | Close active modal / Lightbox |

## How to Run with Docker Compose

To run the application easily via Docker:

1. Clone the repository.
2. Start the application:
   ```bash
   docker-compose up -d
   ```
3. Access the app in your browser at `http://localhost:8080`.

### Data Volume Mounting

By default, `docker-compose.yml` mounts a local `./data` directory into the container at `/app/data`. This allows you to:
- Retain saved workouts and stats across container restarts.
- Directly edit or backup `plans.yml` and `stats.yml` on your host machine.

## Local Development (Node.js)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open `http://localhost:8080` (or the port specified in `PORT`).