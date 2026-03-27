# 🏛️ Mystic Vault

A browser-based, team puzzle adventure game built with **React** for live college/school events and competitions. Teams race through encrypted ciphers, a dark maze, corrupted command sequences, and a final boss stage to unlock the vault — all against the clock.

---

## 📸 Game Flow

```
Intro Screen → Login → Cipher Gate → Dark Maze → Command Override → Boss Stage → Unlock Vault
```

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org) (v16 or higher)
- npm (comes with Node.js)

### 1. Extract the project
Unzip `mystic-vault.zip` and open the folder.

### 2. Install dependencies
```bash
npm install
```

### 3. Add your Supabase credentials
Open `src/supabase.js` and replace the placeholders:
```js
const SUPABASE_URL  = 'https://your-project.supabase.co';
const SUPABASE_ANON = 'your-anon-key';
```

### 4. Start the development server
```bash
npm start
```
The app opens at `http://localhost:3000`

### 5. Build for production
```bash
npm run build
```
Deploy the generated `build/` folder to GitHub Pages, Netlify, or Vercel.

---

## 🗄️ Supabase Database Setup

### Step 1 — Create a project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Give it a name → set a password → choose a region → Create

### Step 2 — Create the `teams` table
Go to **Table Editor** → **New Table** → name it `teams`

Add these columns:

| Column            | Type         | Notes              |
|-------------------|--------------|--------------------|
| `team_id`         | text         | Primary Key        |
| `password`        | text         |                    |
| `team_name`       | text         |                    |
| `current_round`   | int4         | Default: `1`       |
| `fragment1`       | text         |                    |
| `fragment2`       | text         |                    |
| `fragment3`       | text         |                    |
| `elapsed_seconds` | int4         |                    |
| `disqualified`    | bool         | Default: `false`   |
| `finish_time`     | timestamptz  |                    |
| `start_time`      | timestamptz  |                    |
| `last_updated`    | timestamptz  |                    |
| `maze_steps`      | int4         |                    |

### Step 3 — Disable Row Level Security (RLS)
> ⚠️ This is required or the game cannot read team data.

Go to **Databases and Storage → Firestore → teams table** → disable RLS.

Or run this in the **SQL Editor**:
```sql
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
```

### Step 4 — Add your teams
In **Table Editor**, click **Insert Row** for each team:

| team_id  | password  | team_name    |
|----------|-----------|--------------|
| TEAM-01  | vault2024 | Team Alpha   |
| TEAM-02  | shadow99  | Team Beta    |
| TEAM-03  | cipher7   | Team Gamma   |

To **change a password** mid-event → just edit the cell in Table Editor.  
To **disqualify a team** → set `disqualified` to `true`.

---

## ⚙️ Admin Panel

The Admin Panel lets you fully customise the game before the event.

### How to access
On the **Login screen**, enter:
- **Team ID:** `ADMIN`
- **Password:** `Admin`

> To change the admin credentials, open `src/pages/LoginScreen.js` and edit:
> ```js
> const ADMIN_ID   = 'ADMIN';
> const ADMIN_PASS = 'Admin';
> ```

### What you can customise

| Tab         | What you can change |
|-------------|---------------------|
| Difficulty  | Easy / Medium / Hard — affects maze size, visibility, number of puzzles and steps |
| Fragments   | The 3 words teams collect (these combine to form the final vault password) |
| Round 1     | Add/edit/remove cipher puzzles — question text, hint, and answer |
| Round 3     | Scrambled commands, correct answers, execution sequence order, and clue text |
| Boss Stage  | Symbol pool (emoji + label + ID), correct sequence order, and clue text |

---

## 🎮 Rounds Overview

### Round 1 — Cipher Gate
Teams solve text-based puzzles (Caesar ciphers, scrambled words, logic riddles). Each puzzle has a question, a hint, and an answer. All customisable via the Admin Panel.

### Round 2 — Dark Maze
Teams navigate a procedurally generated maze with limited visibility. A minimap in the corner gradually reveals explored paths. Maze size and visibility range change with difficulty.

### Round 3 — Command Override
**Step 1:** Teams unscramble corrupted commands by typing the correct version.  
**Step 2:** Teams drag and drop the commands into the correct execution order using the clue.  
Number of steps in the sequence changes with difficulty.

### Boss Stage — Vault Cipher
Teams select symbols from a pool in the exact order described in the clue. The number of symbols required changes with difficulty.

### Final Stage — Unlock the Vault
Teams combine their 3 collected fragments in the format `WORD-CODE-WORD` and submit it as the vault password.

---

## 🎚️ Difficulty Settings

| Setting | Cipher Puzzles | Maze Size | Visibility | Cmd Steps | Boss Symbols |
|---------|---------------|-----------|------------|-----------|--------------|
| Easy    | 2             | 11 × 9    | 4 cells    | 3         | 3            |
| Medium  | 3             | 15 × 11   | 3 cells    | 4         | 4            |
| Hard    | 3             | 19 × 15   | 2 cells    | 5         | 5            |

---

## 🔊 Sound Effects

The game uses the Web Audio API to generate sounds — no audio files needed:
- Click sounds on every interaction
- Success fanfare when a puzzle is solved
- Alarm buzz on wrong answers
- Vault-opening crescendo on victory
- Ambient background drone music during gameplay

Toggle sound with the **♪** button in the bottom-right corner.

---

## 📁 Project Structure

```
mystic-vault/
├── public/
│   └── index.html
├── src/
│   ├── App.js                    # Main router & layout
│   ├── index.js                  # React entry point
│   ├── supabase.js               # Supabase client & DB helpers
│   ├── context/
│   │   └── GameContext.js        # Global game state + default puzzle config
│   ├── hooks/
│   │   └── useAudio.js           # Web Audio sound engine
│   ├── components/
│   │   ├── Starfield.js          # Animated star background (canvas)
│   │   ├── StatusBar.js          # Fixed top bar — team, timer, fragments
│   │   ├── Flash.js              # Toast notification system
│   │   └── ProgressTrack.js      # Stage progress indicator
│   ├── pages/
│   │   ├── IntroScreen.js        # Story intro + interactive vault map
│   │   ├── LoginScreen.js        # Team authentication + admin login
│   │   ├── Round1Screen.js       # Cipher Gate
│   │   ├── Round2Screen.js       # Dark Maze with minimap
│   │   ├── Round3Screen.js       # Command Override (unscramble + drag & drop)
│   │   ├── BossScreen.js         # Boss Stage symbol cipher
│   │   ├── FinalScreen.js        # Vault unlock
│   │   └── AdminPanel.js         # Full customisation panel
│   └── styles/
│       └── global.css            # All styles (vault dark theme)
├── .env                          # Supabase credentials (never commit this)
├── .gitignore
├── package.json
└── README.md
```

---

## 🛠️ Tech Stack

| Technology       | Usage                                      |
|------------------|--------------------------------------------|
| React 18         | Component-based UI                         |
| React Router v6  | Screen navigation                          |
| Supabase         | Team credentials, progress, leaderboard    |
| Web Audio API    | Procedural sound effects & ambient music   |
| Canvas API       | Maze rendering with fog of war + minimap   |
| CSS3             | Animations, gold vault dark theme          |
| Google Fonts     | Cinzel + Rajdhani + Share Tech Mono        |

---

## 🌐 Deploying for the Event

### Option 1 — GitHub Pages (free)
```bash
npm install --save-dev gh-pages
```
Add to `package.json`:
```json
"homepage": "https://YOUR-USERNAME.github.io/mystic-vault",
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d build"
}
```
Then run:
```bash
npm run deploy
```

### Option 2 — Netlify (free, easiest)
1. Go to [netlify.com](https://netlify.com) → New site
2. Drag and drop the `build/` folder
3. Done — you get a live URL instantly

### Option 3 — Vercel (free)
```bash
npm install -g vercel
vercel
```

---

## ❓ Troubleshooting

| Problem | Fix |
|---------|-----|
| "No teams found" on login | Disable RLS on the teams table in Supabase |
| "Team ID not found" | Check the `team_id` column matches exactly what you type |
| Maze not responding to keys | Click on the maze area first to give it focus |
| Admin panel not opening | Password is case-sensitive — use `Admin` not `admin` |
| Blank screen after build | Set the correct `homepage` in `package.json` for your deployment URL |

---

*Built for live college/school events. Single-page React app — deploy once, play anywhere.*

## Fix elapsed_seconds null issue

Run this SQL in Supabase SQL Editor to ensure the column type is correct:

```sql
-- Ensure elapsed_seconds is integer type (not text or null-typed)
ALTER TABLE teams ALTER COLUMN elapsed_seconds TYPE integer USING elapsed_seconds::integer;

-- Also ensure finish_time is timestamptz
ALTER TABLE teams ALTER COLUMN finish_time TYPE timestamptz USING finish_time::timestamptz;

-- Verify columns
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'teams';
```
#   2 3  
 