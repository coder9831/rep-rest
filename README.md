# Rep & Rest

# Build: IronLog

## Overview
I'm a university student athlete who works out frequently. Build a website, just for my own use, that lets me create a weekly workout plan, run each workout with built-in timers, log the weight and reps I lift for every set, and track my progress over time. Every change I make to my workout plan must be saved, and I must be able to look back at older versions of my plan.

## Tech stack
- Use Lovable's built-in backend for Google sign-in and the database.
- Platform: website (used in a web browser).
- All weights are in pounds (lb).

## User flow

### 1. Account
- Sign in with Google.

### 2. Weekly schedule
- Choose how many days per week I want to lift.
- Select which days of the week I want to work out.

### 3. Create each workout day
For each workout day, I can:
- Name the workout (e.g. "Push Day").
- Add exercises by name. Suggest exercises from my saved exercise list so the same exercise isn't saved under different names (e.g. "Bench Press" vs "bench").
- Set the number of sets and reps for each exercise.
- Set one rest time for each exercise (used between all of that exercise's sets).

### 4. Doing a workout
- I can start any workout day on any day of the week, even if it isn't scheduled for that day.
- A Start button starts a workout timer and clearly shows that a workout is in progress.
- For every set, I enter the weight (lb) and the reps I actually did (these may differ from the plan), then tap a checkmark to mark the set done.
- Checking off a set automatically starts that exercise's rest timer.
- Next to each exercise, show what I lifted last session (e.g. "Last: 185 lb × 8, 8, 7").
- Optional notes per exercise and per session (e.g. "left shoulder tight").
- A Finish button saves everything from the workout and shows how long I worked out.

## After the workout
- Workout history: past sessions shown on a calendar. Tapping a date shows exactly what I did that day.
- Progress line chart (per exercise): my progress over time, with a toggle to switch between top weight (heaviest weight lifted that session) and estimated 1-rep max (Epley formula: weight × (1 + reps/30)).
- Volume pie chart: how my total volume (weight × reps) is split between exercises, for a time range I choose (this week, this month, or all time).

## Bodyweight
- I enter my bodyweight (lb) once a month. Each entry is saved with its date.
- Remind me in the app when it has been a month since my last bodyweight entry.

## Managing my plan
- Edit, reorder, delete, or duplicate workout days and exercises.
- Changing the plan must never change past workout records. Keep the plan and the workout logs stored separately.
- Plan version history: every time I save changes to my plan, keep the previous version. I can open a list of older versions, see the date each was saved, and view what the plan looked like at that time.

## Settings and account
- Sign out.
- Delete account.

## Reliability
- Auto-save during a workout. If the tab closes or my device dies, I can come back and continue the unfinished session.

## Data to store
- User: name, email
- Bodyweight log: date, bodyweight (lb)
- Exercise list: my saved exercise names (used for suggestions and to keep each exercise's history together)
- Plan → Workout Days (name, weekday) → Exercises (name, sets, reps, rest time, order)
- Plan versions: version number, date saved, and a full copy of the plan at that time
- Session: date, workout day, plan version used, status (in progress or finished), start time, end time, total duration, session notes
- Set log: session, exercise, set number, weight (lb), reps, completed, exercise notes

## Design
- Dark theme with one bold accent color (a bright orange) for buttons, timers, and checkmarks.
- Clean, modern, athletic feel with a simple sans-serif font.
- Large buttons and checkmarks that are easy to tap between sets.
- Timers shown in big, easy-to-read numbers.
- Layout should still work well if the site is opened on a phone browser.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8e1c7d1c-3a5b-4a5b-8354-9d00b0b6de3c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
