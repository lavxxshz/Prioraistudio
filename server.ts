import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Initialize Gemini API client
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      })
    : null;

  // Resilient wrapper to execute Gemini requests with retry and backoff on 503 / demand limits
  async function generateContentWithRetry(params: any, retries = 2, delayMs = 1200) {
    if (!ai) {
      throw new Error("Gemini API key is not configured.");
    }
    for (let i = 0; i < retries; i++) {
      try {
        return await ai.models.generateContent(params);
      } catch (err: any) {
        const errMsg = err.message || String(err);
        const isTransient = err.status === 503 || 
                            errMsg.includes("503") || 
                            errMsg.includes("demand") || 
                            errMsg.includes("UNAVAILABLE") || 
                            errMsg.includes("ResourceExhausted") ||
                            errMsg.includes("rate limit");
        if (isTransient && i < retries - 1) {
          console.warn(`Gemini temporary error: ${errMsg}. Retrying in ${delayMs}ms... (Attempt ${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        throw err;
      }
    }
    throw new Error("Failed after retries");
  }

  // Endpoint: Prioritize tasks using AI
  app.post("/api/gemini/prioritize", async (req, res) => {
    try {
      if (!ai) {
        return res.status(503).json({ error: "Gemini API key is not configured." });
      }
      const { tasks } = req.body;
      if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        return res.json({ prioritizedTasks: [] });
      }

      const prompt = `You are a productivity and prioritization expert for PriorAI (an app helping people conquer procrastination and escape last-minute deadlines).
Your task is to analyze these user tasks and rank them in absolute order of priority (rank 1 is highest priority, 2 is next, etc.).
Factor in:
1. Urgency: How close is the deadline? Compare with the current time (provided as: ${new Date().toISOString()}).
2. Importance: How critical is the task (high/medium/low)?
3. Estimated Duration: Tasks that take longer need to be started earlier.
4. Overdue tasks must immediately be prioritized unless they are completed. Completed tasks should be ranked last or excluded from urgent focus.

For each task, provide:
- id: The original task's ID.
- aiPrioritizedRank: A unique integer ranking starting from 1 (1 being the absolute most urgent/critical).
- aiRecommendation: A short, action-oriented, encouraging sentence (max 20 words) explaining why this is ranked this way and what immediate micro-step the user should take right now (e.g. "Due in 3 hours! Spend 10 minutes setting up your document template to build momentum.").

Tasks JSON:
${JSON.stringify(tasks, null, 2)}
`;

      const response = await generateContentWithRetry({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              prioritizedTasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    aiPrioritizedRank: { type: Type.INTEGER },
                    aiRecommendation: { type: Type.STRING }
                  },
                  required: ["id", "aiPrioritizedRank", "aiRecommendation"]
                }
              }
            },
            required: ["prioritizedTasks"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      res.json(data);
    } catch (error: any) {
      console.warn("Prioritize API error, running local fallback logic (transient limit or quota):", error.message || error);
      
      // Dynamic robust local rule-based fallback
      try {
        const { tasks } = req.body;
        if (!tasks || !Array.isArray(tasks)) {
          return res.json({ prioritizedTasks: [] });
        }
        
        // Sort: active tasks first, sorted by deadline proximity, then importance (high > medium > low)
        const getImportanceValue = (imp: string) => {
          if (imp === 'high') return 3;
          if (imp === 'medium') return 2;
          return 1;
        };

        const sorted = [...tasks].sort((a, b) => {
          if (a.status === 'completed' && b.status !== 'completed') return 1;
          if (a.status !== 'completed' && b.status === 'completed') return -1;
          
          const timeA = new Date(a.deadline).getTime();
          const timeB = new Date(b.deadline).getTime();
          if (Math.abs(timeA - timeB) > 1000 * 60 * 10) { // more than 10 mins diff
            return timeA - timeB;
          }
          return getImportanceValue(b.importance) - getImportanceValue(a.importance);
        });

        const prioritizedTasks = sorted.map((task, idx) => {
          let rec = "Prioritize energy here. Open materials for 5 mins to break resistance.";
          const hrsLeft = (new Date(task.deadline).getTime() - Date.now()) / (1000 * 60 * 60);
          if (hrsLeft < 0) {
            rec = "Overdue priority! Close all open tabs and do just one tiny step to rescue this task.";
          } else if (hrsLeft < 12) {
            rec = `Impending deadline (${Math.ceil(hrsLeft)}h left)! Start immediately with a simple 10-minute focus sprint.`;
          } else if (task.importance === 'high') {
            rec = "High-importance anchor task. Break this down and tackle the hardest milestone first.";
          }
          return {
            id: task.id,
            aiPrioritizedRank: idx + 1,
            aiRecommendation: rec
          };
        });

        res.json({ prioritizedTasks });
      } catch (fallbackErr: any) {
        res.status(500).json({ error: "Failed to prioritize tasks and fallback failed." });
      }
    }
  });

  // Endpoint: Smart Breakdown (milestones)
  app.post("/api/gemini/breakdown", async (req, res) => {
    try {
      if (!ai) {
        return res.status(503).json({ error: "Gemini API key is not configured." });
      }
      const { task } = req.body;
      if (!task) {
        return res.status(400).json({ error: "Task is required." });
      }

      const prompt = `You are an expert action-planner. Break down the following task into 3 to 5 highly actionable, granular, sequential subtasks (milestones).
Each milestone should have a clear, specific outcome to reduce friction and build momentum.
Assign an intermediate percentage-based target for when each milestone should be done relative to the total time before the deadline (e.g., 20% of the way through, 50% through, 80% through).

Task:
Title: ${task.title}
Description: ${task.description}
Deadline: ${task.deadline}
Category: ${task.category}
Estimated Duration: ${task.estimatedDuration} mins

Return a list of milestones with their title and relative timeline fraction (0.0 to 1.0) of when they should be completed relative to the deadline starting from now.
`;

      const response = await generateContentWithRetry({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              milestones: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "Action-focused milestone title, e.g. 'Outline intro paragraphs'" },
                    relativeTimelineFraction: { 
                      type: Type.NUMBER, 
                      description: "Fraction between 0.0 and 1.0 indicating when this milestone should be completed relative to the overall duration until the deadline." 
                    }
                  },
                  required: ["title", "relativeTimelineFraction"]
                }
              }
            },
            required: ["milestones"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      res.json(data);
    } catch (error: any) {
      console.warn("Breakdown API error, returning local fallback subtasks:", error.message || error);
      
      const { task } = req.body;
      const title = task?.title || "Task";
      
      // Smart static fallbacks depending on name keywords
      let fallbackMilestones = [
        { title: `Gather initial references & outline structure for ${title}`, relativeTimelineFraction: 0.2 },
        { title: `Execute core 25-minute focus session on ${title}`, relativeTimelineFraction: 0.5 },
        { title: `Refine, polish draft and double-check requirements for ${title}`, relativeTimelineFraction: 0.85 }
      ];

      const lowerTitle = title.toLowerCase();
      if (lowerTitle.includes('study') || lowerTitle.includes('exam') || lowerTitle.includes('read')) {
        fallbackMilestones = [
          { title: "Review textbook notes and key terms list", relativeTimelineFraction: 0.25 },
          { title: "Complete 3 mock study questions / active recall loop", relativeTimelineFraction: 0.6 },
          { title: "Summarize confusing concepts on a single cheat-sheet page", relativeTimelineFraction: 0.9 }
        ];
      } else if (lowerTitle.includes('meet') || lowerTitle.includes('discuss') || lowerTitle.includes('call')) {
        fallbackMilestones = [
          { title: "Draft bullet-point agenda for the discussion", relativeTimelineFraction: 0.15 },
          { title: "Verify connection link, notes doc and audio setup", relativeTimelineFraction: 0.6 },
          { title: "Log decisions & immediate action list right after the call", relativeTimelineFraction: 0.95 }
        ];
      }

      res.json({ milestones: fallbackMilestones });
    }
  });

  // Endpoint: Personalized Proactive Recommendations
  app.post("/api/gemini/recommend", async (req, res) => {
    try {
      if (!ai) {
        return res.status(503).json({ error: "Gemini API key is not configured." });
      }
      const { tasks, habits } = req.body;

      const prompt = `You are the core AI productivity brain of PriorAI, a proactive productivity assistant.
Analyze the user's workload (tasks, deadlines, habits) and generate 2 to 3 high-impact, highly personalized proactive recommendations.
We want to warn them about impending pile-ups, point out ideal times to work, suggest habit pairings, or urge them to reschedule low-priority tasks.

Ensure each recommendation has:
- type: 'urgency' (deadline in danger), 'schedule' (time blocking tip), 'general' (habit or workflow tip)
- title: A short punchy heading (e.g., "Impending Physics Crash", "Perfect Focus Window Found")
- description: Explaining why we suggest this and how they can do it. Speak with active, motivating, human empathy. (max 30 words)
- severity: 'high', 'medium', or 'low'
- suggestedAction: A quick action label (e.g. "Reschedule", "Start Focus Block", "Log Habit")
- targetTaskId: (optional) ID of a task in danger.

Current time context: ${new Date().toISOString()}
Tasks JSON:
${JSON.stringify(tasks || [], null, 2)}
Habits JSON:
${JSON.stringify(habits || [], null, 2)}
`;

      const response = await generateContentWithRetry({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, description: "urgency, schedule, or general" },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    severity: { type: Type.STRING, description: "high, medium, or low" },
                    suggestedAction: { type: Type.STRING },
                    targetTaskId: { type: Type.STRING }
                  },
                  required: ["type", "title", "description", "severity"]
                }
              }
            },
            required: ["recommendations"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      res.json(data);
    } catch (error: any) {
      console.warn("Recommend API error, running local fallback logic:", error.message || error);
      
      try {
        const { tasks, habits } = req.body;
        const recommendations = [];

        // Check for urgent pending tasks
        const activeTasks = (tasks || []).filter((t: any) => t.status !== 'completed');
        const urgentTask = [...activeTasks].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];
        
        if (urgentTask) {
          const hrsLeft = (new Date(urgentTask.deadline).getTime() - Date.now()) / (1000 * 60 * 60);
          recommendations.push({
            type: 'urgency',
            title: `Impending Deadline: "${urgentTask.title}"`,
            description: hrsLeft < 12 
              ? "This task is due very soon. Stop scrolling and start a tiny 5-minute draft now to avoid cramming."
              : "Keep ahead of the game. Break this task into micro-milestones today to ensure easy success.",
            severity: hrsLeft < 12 ? 'high' : 'medium',
            suggestedAction: 'Start Focus Block',
            targetTaskId: urgentTask.id
          });
        }

        // Habit block recommendation
        const pendingHabits = (habits || []).filter((h: any) => {
          const todayStr = new Date().toISOString().split('T')[0];
          return !h.history[todayStr];
        });

        if (pendingHabits.length > 0) {
          recommendations.push({
            type: 'general',
            title: "Habit Stacking Opportunity",
            description: `Stack "${pendingHabits[0].name}" right after you complete your next task for maximum consistency!`,
            severity: 'medium',
            suggestedAction: 'Log Habit'
          });
        }

        // Default scheduler block
        recommendations.push({
          type: 'schedule',
          title: "Create a Zero-Friction Time Slot",
          description: "Protect your afternoon focus! Block off a dedicated 30-minute quiet zone with zero notification distractions.",
          severity: 'low',
          suggestedAction: 'Start Focus Block'
        });

        res.json({ recommendations: recommendations.slice(0, 3) });
      } catch (fallbackErr: any) {
        res.status(500).json({ error: "Failed to generate recommendations and fallback failed." });
      }
    }
  });

  // Endpoint: Companion Chat
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      if (!ai) {
        return res.status(503).json({ error: "Gemini API key is not configured." });
      }
      const { messages, tasks, currentTask } = req.body;
      
      const chatHistory = messages || [];
      const userMessage = chatHistory[chatHistory.length - 1]?.text || "";

      let contextPrompt = `You are the PriorAI Companion, a supportive, warm, but highly action-driven AI productivity coach.
You help users tackle procrastination, break through paralysis, and complete urgent tasks.
Be encouraging, practical, and highly focused on micro-steps. Never suggest giant schedules. Suggest doing 5 or 10 minutes of work right now to build momentum.
Avoid overly generic or robotic responses. Keep your responses concise (max 3 sentences) and conversational.

`;

      if (currentTask) {
        contextPrompt += `The user is currently focused on the task: "${currentTask.title}" (${currentTask.description || "No description"}), which has importance: ${currentTask.importance} and is due on ${currentTask.deadline}. Use this to guide them if they sound overwhelmed.`;
      } else if (tasks && tasks.length > 0) {
        contextPrompt += `The user has the following pending tasks: ${tasks.map((t: any) => `"${t.title}" (due: ${t.deadline}, importance: ${t.importance})`).join(", ")}.`;
      }

      const formattedHistory = chatHistory.slice(0, -1).map((msg: any) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      }));

      const chatContents = [
        { role: "user", parts: [{ text: contextPrompt }] },
        ...formattedHistory,
        { role: "user", parts: [{ text: userMessage }] }
      ];

      const response = await generateContentWithRetry({
        model: "gemini-3.5-flash",
        contents: chatContents,
      });

      res.json({ response: response.text });
    } catch (error: any) {
      console.warn("Chat API error, using coach fallback:", error.message || error);
      
      // Professional, encouraging local fallback message
      res.json({ 
        response: "I am experiencing a brief surge in traffic, but your momentum is what matters! Take a slow, deep breath. Focus is built one tiny 5-minute block at a time. What is one small step you can start right now?" 
      });
    }
  });

  // Endpoint: Parse natural language task input
  app.post("/api/gemini/parse-task", async (req, res) => {
    try {
      if (!ai) {
        return res.status(503).json({ error: "Gemini API key is not configured." });
      }
      const { query, currentLocalTime } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query is required." });
      }

      const prompt = `You are an expert natural language task parser. Given a user's task input phrase, extract the task metadata relative to the current local date/time: "${currentLocalTime}".
Analyze phrases like "tomorrow 2 pm meeting", "write lab report due next monday at 10am", "buy groceries in 2 hours", etc.

Instructions:
1. Extract a clear task "title". Clean it of the temporary date/time words (e.g. "tomorrow 2 pm meeting" becomes "Meeting", "write lab report due next monday" becomes "Write lab report").
2. Calculate the "deadlineDate" (format YYYY-MM-DD) relative to the provided current local time: "${currentLocalTime}".
   - If "tomorrow" is mentioned, use tomorrow's date.
   - If "next Monday" is mentioned, calculate next Monday's date.
   - If no date is mentioned, use the current local time's date (or tomorrow's date if the time has already passed today).
3. Determine the "deadlineTime" (format HH:MM in 24h format, e.g., "14:00" for 2 pm).
   - If no specific time is mentioned, default to "23:59".
4. Choose the best "category" from: "Studies", "Work", "Personal", "Finance", "Health", "Admin".
5. Choose the best "importance" from: "high", "medium", "low".
6. Estimate "estimatedDuration" in minutes as an integer (e.g. 15, 30, 60, 120, 240). Defaults to 60.

Query phrase: "${query}"
`;

      const response = await generateContentWithRetry({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              deadlineDate: { type: Type.STRING, description: "Format: YYYY-MM-DD" },
              deadlineTime: { type: Type.STRING, description: "Format: HH:MM" },
              category: { type: Type.STRING, description: "Studies, Work, Personal, Finance, Health, Admin" },
              importance: { type: Type.STRING, description: "high, medium, low" },
              estimatedDuration: { type: Type.INTEGER, description: "Duration in minutes" }
            },
            required: ["title", "deadlineDate", "deadlineTime", "category", "importance", "estimatedDuration"]
          }
        }
      });

      const parsedData = JSON.parse(response.text || "{}");
      res.json(parsedData);
    } catch (error: any) {
      console.warn("Parse task API error, running local rule-based extractor fallback:", error.message || error);
      
      try {
        const { query, currentLocalTime } = req.body;
        const now = currentLocalTime ? new Date(currentLocalTime) : new Date();
        
        let title = query || "Smart Task";
        let dateObj = new Date(now.getTime() + 24 * 60 * 60 * 1000); // default tomorrow
        let timeStr = "17:00";
        let category = "Personal";
        let importance = "medium";
        let estimatedDuration = 60;

        const cleanQuery = query.toLowerCase();

        // 1. Title & Category Guessing
        if (cleanQuery.includes("study") || cleanQuery.includes("exam") || cleanQuery.includes("assignment") || cleanQuery.includes("maths") || cleanQuery.includes("bio")) {
          category = "Studies";
        } else if (cleanQuery.includes("work") || cleanQuery.includes("meeting") || cleanQuery.includes("project") || cleanQuery.includes("report")) {
          category = "Work";
        } else if (cleanQuery.includes("bill") || cleanQuery.includes("pay") || cleanQuery.includes("rent") || cleanQuery.includes("finance")) {
          category = "Finance";
        } else if (cleanQuery.includes("run") || cleanQuery.includes("gym") || cleanQuery.includes("workout") || cleanQuery.includes("health")) {
          category = "Health";
        }

        // Clean time words out of the title
        title = query
          .replace(/tomorrow/gi, "")
          .replace(/next monday/gi, "")
          .replace(/next week/gi, "")
          .replace(/at \d+(am|pm)/gi, "")
          .replace(/\bin \d+ hours\b/gi, "")
          .trim();

        if (!title) title = "Quick Task";

        // 2. Date Parsing
        if (cleanQuery.includes("tomorrow")) {
          dateObj = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        } else if (cleanQuery.includes("next monday")) {
          const day = now.getDay();
          const daysToNextMonday = (1 + 7 - day) % 7 || 7;
          dateObj = new Date(now.getTime() + daysToNextMonday * 24 * 60 * 60 * 1000);
        } else if (cleanQuery.includes("today") || cleanQuery.includes("hours")) {
          dateObj = now;
        }

        // 3. Time Parsing (e.g. "at 2pm", "at 10am")
        const pmMatch = cleanQuery.match(/(\d+)\s*pm/);
        const amMatch = cleanQuery.match(/(\d+)\s*am/);
        if (pmMatch) {
          const hour = parseInt(pmMatch[1], 10);
          const hour24 = hour === 12 ? 12 : hour + 12;
          timeStr = `${String(hour24).padStart(2, "0")}:00`;
        } else if (amMatch) {
          const hour = parseInt(amMatch[1], 10);
          const hour24 = hour === 12 ? 0 : hour;
          timeStr = `${String(hour24).padStart(2, "0")}:00`;
        }

        const deadlineDate = dateObj.toISOString().split("T")[0];

        res.json({
          title,
          deadlineDate,
          deadlineTime: timeStr,
          category,
          importance,
          estimatedDuration
        });
      } catch (fallbackErr) {
        res.status(500).json({ error: "Failed to parse task and fallback extractor failed." });
      }
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
