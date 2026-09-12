# AutoManager - Autonomous Fantasy Cricket AI

AutoManager is an autonomous fantasy-cricket manager that pursues a user's team objective under budget, squad, availability, and changing match-context constraints. Built with React, Express, and the Gemini API, it dynamically drafts, evaluates, and updates your fantasy team.

## Features

- **Autonomous Agentic Workflow:** Uses Google's Gemini API to interpret user preferences, retrieve player stats, and make intelligent drafting decisions.
- **Constraints Validation Engine:** Strictly validates the budget (Max 100), team size (11 players), and role requirements (min 1 WK, 3 BAT, 3 BOWL, 1 ALL).
- **Environment Simulator:** Simulate real-world events like weather changes (e.g., Rain Delay, Clear Weather) and player injuries/recoveries. The agent reacts dynamically to these changes by re-evaluating the squad.
- **Strategic Preferences:** Choose between different strategies (Balanced, Maximize Batting, Maximize Bowling) to guide the AI's decision-making process.
- **Interactive Dashboard:** Fully responsive interface built with React, Tailwind CSS, and Lucide icons. Includes a live Player Pool for manual overrides and an "Agent Thoughts" log to trace the AI's reasoning.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Motion (animations), Lucide React
- **Backend:** Express.js (Node.js)
- **AI:** `@google/genai` SDK using the `gemini-3.6-flash` model.

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root directory and add the following variables:

```env
# Required for Gemini AI API calls.
GEMINI_API_KEY="your_gemini_api_key_here"

# The URL where this applet is hosted (or localhost)
APP_URL="http://localhost:3000"
```

### 2. Install Dependencies

Install the project dependencies using npm:

```bash
npm install
```

### 3. Run the Development Server

Start the full-stack application (frontend and backend) in development mode:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### 4. Build for Production

To compile the frontend and backend for production:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

## How It Works

1. **Player Pool & Context:** The backend serves a simulated mock database of players and their current form, along with the active match context (weather, pitch, news).
2. **AI Drafting:** When "Run Manager" is triggered, the Express backend sends a structured prompt containing the player data, context, and current team state to the Gemini model.
3. **Structured Output:** The agent returns a strictly formatted JSON response detailing its reasoning, actions taken, and the final 11-player squad IDs.
4. **Scoring Simulator:** The team is passed through a scoring simulator to calculate projected points based on form, average scores, and pitch conditions, while checking for constraint violations.
5. **Live Updates:** Any changes via the Environment Simulator automatically wake up the agent to re-optimize the team.
