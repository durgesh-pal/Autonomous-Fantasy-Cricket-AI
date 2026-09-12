import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
app.use(express.json());
const PORT = 3000;

// Mock Data
const PLAYERS = [
  { id: "1", name: "Virat Kohli", role: "BAT", price: 10, form: 9.5, isAvailable: true, averageScore: 60, recentScores: [85, 42, 76] },
  { id: "2", name: "Rohit Sharma", role: "BAT", price: 9.5, form: 8.0, isAvailable: true, averageScore: 50, recentScores: [20, 105, 12] },
  { id: "3", name: "Jasprit Bumrah", role: "BOWL", price: 9.5, form: 9.0, isAvailable: true, averageScore: 55, recentScores: [40, 60, 55] },
  { id: "4", name: "Rashid Khan", role: "BOWL", price: 9, form: 8.5, isAvailable: true, averageScore: 52, recentScores: [35, 45, 60] },
  { id: "5", name: "Hardik Pandya", role: "ALL", price: 9, form: 7.5, isAvailable: false, averageScore: 48, recentScores: [10, 25, 40] }, // Injured
  { id: "6", name: "Ravindra Jadeja", role: "ALL", price: 9, form: 8.5, isAvailable: true, averageScore: 50, recentScores: [50, 20, 55] },
  { id: "7", name: "MS Dhoni", role: "WK", price: 8.5, form: 7.0, isAvailable: true, averageScore: 45, recentScores: [25, 30, 45] },
  { id: "8", name: "KL Rahul", role: "WK", price: 9, form: 8.0, isAvailable: true, averageScore: 49, recentScores: [55, 40, 20] },
  { id: "9", name: "Kane Williamson", role: "BAT", price: 9, form: 8.0, isAvailable: true, averageScore: 52, recentScores: [50, 45, 60] },
  { id: "10", name: "Steve Smith", role: "BAT", price: 9, form: 7.5, isAvailable: true, averageScore: 50, recentScores: [30, 40, 50] },
  { id: "11", name: "Mitchell Starc", role: "BOWL", price: 9.5, form: 8.0, isAvailable: true, averageScore: 54, recentScores: [45, 55, 40] },
  { id: "12", name: "Pat Cummins", role: "ALL", price: 9, form: 8.5, isAvailable: true, averageScore: 51, recentScores: [30, 60, 45] },
  { id: "13", name: "Shubman Gill", role: "BAT", price: 8.5, form: 9.0, isAvailable: true, averageScore: 55, recentScores: [70, 65, 40] },
  { id: "14", name: "Trent Boult", role: "BOWL", price: 9, form: 8.0, isAvailable: true, averageScore: 50, recentScores: [40, 50, 45] },
  { id: "15", name: "Quinton de Kock", role: "WK", price: 9, form: 8.5, isAvailable: true, averageScore: 52, recentScores: [60, 45, 50] },
  { id: "16", name: "Ben Stokes", role: "ALL", price: 9.5, form: 7.0, isAvailable: true, averageScore: 48, recentScores: [20, 30, 40] },
];

let matchContext = {
  weather: "Clear and sunny. Good for batting.",
  news: "Hardik Pandya has been ruled out of the match due to an ankle injury. The pitch is expected to be flat.",
  pitch: "Batting friendly"
};

let currentTeam: any[] = [];
let managerLogs: any[] = [];

function logManagerAction(action: string, detail: string) {
  managerLogs.push({ time: new Date().toISOString(), action, detail });
}

// APIs for Sandbox Tools
app.get("/api/players", (req, res) => {
  res.json(PLAYERS);
});

app.get("/api/context", (req, res) => {
  res.json(matchContext);
});

app.post("/api/admin/update-context", (req, res) => {
  const { weather, news, pitch, playerUpdate } = req.body;
  if (weather) matchContext.weather = weather;
  if (news) matchContext.news = news;
  if (pitch) matchContext.pitch = pitch;
  
  if (playerUpdate) {
    const player = PLAYERS.find(p => p.id === playerUpdate.id);
    if (player) {
      if (playerUpdate.isAvailable !== undefined) player.isAvailable = playerUpdate.isAvailable;
    }
  }
  logManagerAction("Context Update", "Match context updated by external trigger.");
  res.json({ success: true, context: matchContext });
});

// Scoring Simulator
app.post("/api/simulate", (req, res) => {
  const { teamIds } = req.body;
  const team = PLAYERS.filter(p => teamIds.includes(p.id));
  
  let projectedScore = 0;
  let constraintsViolated: string[] = [];
  
  let totalCost = 0;
  let roles = { BAT: 0, BOWL: 0, ALL: 0, WK: 0 };
  let hasUnavailable = false;

  team.forEach(p => {
    projectedScore += p.averageScore * (p.form / 10);
    totalCost += p.price;
    roles[p.role as keyof typeof roles]++;
    if (!p.isAvailable) hasUnavailable = true;
  });

  // Simple adjustment based on pitch
  if (matchContext.pitch === "Batting friendly") {
    projectedScore += roles.BAT * 5;
  } else if (matchContext.pitch === "Bowling friendly") {
    projectedScore += roles.BOWL * 5;
  }

  if (totalCost > 100) constraintsViolated.push("Budget exceeded (Max 100)");
  if (team.length !== 11) constraintsViolated.push("Team must have exactly 11 players");
  if (roles.WK < 1) constraintsViolated.push("At least 1 Wicket Keeper required");
  if (roles.BAT < 3) constraintsViolated.push("At least 3 Batters required");
  if (roles.BOWL < 3) constraintsViolated.push("At least 3 Bowlers required");
  if (roles.ALL < 1) constraintsViolated.push("At least 1 All-Rounder required");
  if (hasUnavailable) constraintsViolated.push("One or more players in the team are unavailable");

  res.json({ projectedScore, constraintsViolated, totalCost, roles, valid: constraintsViolated.length === 0 });
});

app.post("/api/submit", (req, res) => {
  const { teamIds } = req.body;
  currentTeam = PLAYERS.filter(p => teamIds.includes(p.id));
  logManagerAction("Team Submitted", `Submitted a new team with ${currentTeam.length} players.`);
  res.json({ success: true, team: currentTeam });
});

app.post("/api/admin/set-team", (req, res) => {
  const { teamIds } = req.body;
  currentTeam = PLAYERS.filter(p => teamIds.includes(p.id));
  logManagerAction("Manual Update", `User manually updated team. (Size: ${currentTeam.length})`);
  res.json({ success: true, team: currentTeam });
});

app.get("/api/state", (req, res) => {
  res.json({ team: currentTeam, logs: managerLogs, context: matchContext });
});


// Agent Logic
app.post("/api/agent/run", async (req, res) => {
  const { preference = "Balanced" } = req.body || {};
  logManagerAction("Agent Started", `The autonomous manager is evaluating the team. Strategy: ${preference}`);
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // In a full implementation, the agent would use the interactions API / function calling
    // to query /api/players, /api/context, simulate scores, and build the team.
    // For this prototype, we'll simulate the agentic loop via prompt engineering
    // with a structured output since it's a synchronous HTTP call.

    const currentTeamIds = currentTeam.map(p => p.id);
    const systemPrompt = `
You are an autonomous Fantasy Cricket Manager.
Your goal is to build the optimal 11-player team maximizing projected score under these constraints:
- Budget: 100 max
- Exactly 11 players
- Min 1 WK, 3 BAT, 3 BOWL, 1 ALL
- NEVER pick unavailable players
- Strategic Preference: ${preference}

Current Context:
Weather: ${matchContext.weather}
News: ${matchContext.news}
Pitch: ${matchContext.pitch}

Available Players:
${JSON.stringify(PLAYERS, null, 2)}

Current Team IDs: ${JSON.stringify(currentTeamIds)}

If "Current Team IDs" is not empty, prioritize making minimal necessary swaps (e.g., removing injured players, adapting to weather/pitch changes) rather than building a completely new team from scratch, while keeping the team valid and under budget.

Analyze the context, select the best 11 valid player IDs, and provide your reasoning.
Return your answer in the following JSON schema:
{
  "reasoning": "Detailed explanation of your choices, how you adapted to the news/weather/pitch, and how constraints are met.",
  "selectedTeamIds": ["id1", "id2", ...],
  "actionsTaken": ["Drafted X because...", "Removed Y because of injury..."]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reasoning: { type: Type.STRING },
            selectedTeamIds: { type: Type.ARRAY, items: { type: Type.STRING } },
            actionsTaken: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["reasoning", "selectedTeamIds", "actionsTaken"]
        }
      }
    });

    const resultStr = response.text;
    if (!resultStr) throw new Error("Agent failed to respond.");
    
    const result = JSON.parse(resultStr);
    
    // Simulate scoring for the agent's proposed team
    const team = PLAYERS.filter(p => result.selectedTeamIds.includes(p.id));
    
    let projectedScore = 0;
    let totalCost = 0;
    let roles = { BAT: 0, BOWL: 0, ALL: 0, WK: 0 };
    team.forEach(p => {
      projectedScore += p.averageScore * (p.form / 10);
      totalCost += p.price;
      roles[p.role as keyof typeof roles]++;
    });
    if (matchContext.pitch === "Batting friendly") projectedScore += roles.BAT * 5;
    else if (matchContext.pitch === "Bowling friendly") projectedScore += roles.BOWL * 5;

    logManagerAction("Candidate Evaluation", `Simulated proposed team: Score = ${projectedScore.toFixed(1)}, Cost = ${totalCost}/100.`);
    logManagerAction("Agent Reasoning", result.reasoning);
    result.actionsTaken.forEach((a: string) => logManagerAction("Agent Action", a));
    
    // Auto-submit if it's 11 players
    if (result.selectedTeamIds.length === 11) {
       currentTeam = team;
       logManagerAction("Agent Decision", "Agent automatically submitted the final optimized team.");
    } else {
       logManagerAction("Agent Error", "Agent failed to generate exactly 11 players.");
    }

    res.json({ success: true, agentResult: result, newTeam: currentTeam, logs: managerLogs });

  } catch (error: any) {
    console.error("Agent error:", error);
    logManagerAction("Agent Error", error.message || "Unknown error occurred during agent run.");
    res.status(500).json({ error: "Failed to run agent" });
  }
});

app.post("/api/admin/clear", (req, res) => {
  managerLogs = [];
  currentTeam = [];
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
