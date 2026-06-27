import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Calendar, Heart, ShieldAlert, Plus, Zap, 
  Layers, Bot, Clock, Volume2, Info, RefreshCw, Star
} from 'lucide-react';
import { Task, Habit, TimeBlock, ChatMessage, AIRecommendation, Milestone } from './types';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import SchedulePlanner from './components/SchedulePlanner';
import HabitTracker from './components/HabitTracker';
import FocusZone from './components/FocusZone';
import AIChatCompanion from './components/AIChatCompanion';
import AICapabilityHub from './components/AICapabilityHub';
import { initAuth, googleSignIn, logout } from './lib/firebase';
import { createGoogleCalendarEvent } from './lib/calendar';

// Dynamic default tasks so the user doesn't see a blank slate on first visit
const DEFAULT_TASKS = (): Task[] => {
  const now = new Date();
  
  // Task 1: Extreme crisis (due in 4 hours)
  const due1 = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  // Task 2: Moderate urgency (due tomorrow)
  const due2 = new Date(now.getTime() + 28 * 60 * 60 * 1000);
  // Task 3: Low pressure (due in 3 days)
  const due3 = new Date(now.getTime() + 72 * 60 * 60 * 1000);

  return [
    {
      id: 'task-1',
      title: 'Physics Final Lab Report 🔬',
      description: 'Upload the final laboratory writeup. Need to compile graphs and error analysis tables.',
      deadline: due1.toISOString(),
      importance: 'high',
      category: 'Studies',
      estimatedDuration: 120,
      status: 'active',
      createdAt: now.toISOString(),
      colorHex: '#3b82f6',
      milestones: [
        { id: 'm-1-1', title: 'Plot scatter plots & fitting lines', isCompleted: false },
        { id: 'm-1-2', title: 'Write error propagation formula explanations', isCompleted: false },
        { id: 'm-1-3', title: 'Proofread and export PDF', isCompleted: false }
      ],
      aiPrioritizedRank: 1,
      aiRecommendation: "Crisis Zone! This lab report is due in 4 hours. Skip perfectionism; spend 15 minutes assembling plots now."
    },
    {
      id: 'task-2',
      title: 'Prepare Pitch Deck for Review 💼',
      description: 'Review market sizing and competition slides with the growth lead.',
      deadline: due2.toISOString(),
      importance: 'medium',
      category: 'Work',
      estimatedDuration: 60,
      status: 'pending',
      createdAt: now.toISOString(),
      colorHex: '#10b981',
      milestones: [],
      aiPrioritizedRank: 2,
      aiRecommendation: "Due tomorrow. Use your free slot at 2 PM to draft the competitor matrix slides."
    },
    {
      id: 'task-3',
      title: 'Organize study desk space 🌱',
      description: 'Declutter books, wipe down monitors, reorganize study materials for better focus.',
      deadline: due3.toISOString(),
      importance: 'low',
      category: 'Personal',
      estimatedDuration: 30,
      status: 'pending',
      createdAt: now.toISOString(),
      colorHex: '#8b5cf6',
      milestones: [],
      aiPrioritizedRank: 3,
      aiRecommendation: "Relax. Due in 3 days. Use this 30m declutter as a productive break between studies."
    }
  ];
};

const DEFAULT_HABITS = (): Habit[] => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterdayStr = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return [
    {
      id: 'habit-1',
      name: 'Plan Day on Calendar 📅',
      description: 'Block out focus hours first thing in the morning to prevent panic.',
      frequency: 'daily',
      category: 'Admin ⚙️',
      streak: 5,
      maxStreak: 12,
      lastCompletedDate: yesterdayStr,
      history: { [yesterdayStr]: true },
      createdAt: now.toISOString()
    },
    {
      id: 'habit-2',
      name: '15 Mins Focus Session ⏱️',
      description: 'Complete at least one high-intensity Pomodoro block on your primary task.',
      frequency: 'daily',
      category: 'Studies 📚',
      streak: 2,
      maxStreak: 5,
      lastCompletedDate: yesterdayStr,
      history: { [yesterdayStr]: true },
      createdAt: now.toISOString()
    }
  ];
};

const DEFAULT_CHATS = (): ChatMessage[] => [
  {
    id: 'msg-init-1',
    sender: 'assistant',
    text: "Welcome to PriorAI! I am your productivity companion. Procrastination is a response to stress, not laziness. Tell me what's causing panic, or let me rank your task list to find the absolute easiest starting point.",
    timestamp: new Date().toISOString()
  }
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('priorai_tasks');
    return saved ? JSON.parse(saved) : DEFAULT_TASKS();
  });

  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('priorai_habits');
    return saved ? JSON.parse(saved) : DEFAULT_HABITS();
  });

  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>(() => {
    const saved = localStorage.getItem('priorai_timeblocks');
    return saved ? JSON.parse(saved) : [];
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('priorai_chats');
    return saved ? JSON.parse(saved) : DEFAULT_CHATS();
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'calendar' | 'pillars' | 'chat' | 'hub'>('dashboard');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [activeFocusTask, setActiveFocusTask] = useState<Task | null>(null);
  
  // Loading statuses
  const [isAiPrioritizing, setIsAiPrioritizing] = useState(false);
  const [isAiScheduling, setIsAiScheduling] = useState(false);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);

  // Google Calendar Integration states
  const [gcalUser, setGcalUser] = useState<any | null>(null);
  const [gcalToken, setGcalToken] = useState<string | null>(null);
  const [autoSyncGCal, setAutoSyncGCal] = useState<boolean>(() => {
    const saved = localStorage.getItem('priorai_autosync_gcal');
    return saved !== 'false'; // default is true
  });
  const [isSyncingGCal, setIsSyncingGCal] = useState(false);
  const [gcalStatusMsg, setGcalStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGcalUser(user);
        setGcalToken(token);
      },
      () => {
        setGcalUser(null);
        setGcalToken(null);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('priorai_autosync_gcal', String(autoSyncGCal));
  }, [autoSyncGCal]);

  const handleConnectGCal = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setGcalUser(result.user);
        setGcalToken(result.accessToken);
        showGCalStatus('Successfully connected to Google Calendar!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      showGCalStatus('Failed to connect: ' + (err.message || err), 'error');
    }
  };

  const handleDisconnectGCal = async () => {
    try {
      await logout();
      setGcalUser(null);
      setGcalToken(null);
      showGCalStatus('Disconnected Google Calendar.', 'info');
    } catch (err: any) {
      console.error(err);
    }
  };

  const showGCalStatus = (text: string, type: 'success' | 'error' | 'info') => {
    setGcalStatusMsg({ text, type });
    setTimeout(() => setGcalStatusMsg(null), 5000);
  };

  // LocalStorage Persistences
  useEffect(() => {
    localStorage.setItem('priorai_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('priorai_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('priorai_timeblocks', JSON.stringify(timeBlocks));
  }, [timeBlocks]);

  useEffect(() => {
    localStorage.setItem('priorai_chats', JSON.stringify(chatMessages));
  }, [chatMessages]);

  // Initial recommendation pull on mount
  useEffect(() => {
    fetchAIRecommendations();
  }, []); // Run ONLY on mount to prevent hitting API quota limits!

  // Keep local urgent warnings synchronized instantly whenever tasks or habits change
  useEffect(() => {
    updateLocalRecommendations();
  }, [tasks, habits]);

  const updateLocalRecommendations = () => {
    const now = Date.now();
    setAiRecommendations(prev => {
      // Filter out recommendations whose targetTaskId is completed
      const activeRecs = prev.filter(rec => {
        if (rec.targetTaskId) {
          const task = tasks.find(t => t.id === rec.targetTaskId);
          return task && task.status !== 'completed';
        }
        return true;
      });

      // Add immediate local warnings if they are missing
      const urgentTask = tasks.find(t => t.status !== 'completed' && (new Date(t.deadline).getTime() - now) < 6 * 60 * 60 * 1000);
      const hasUrgentRec = activeRecs.some(r => r.type === 'urgency' && r.targetTaskId === urgentTask?.id);

      const updated = [...activeRecs];
      if (urgentTask && !hasUrgentRec) {
        updated.unshift({
          id: `rec-local-urgent-${Date.now()}`,
          type: 'urgency',
          title: 'Immediate Crash Threat! 🚨',
          description: `"${urgentTask.title}" has under 6 hours remaining. Start Rescue Focus Zone right now to save it.`,
          severity: 'high',
          suggestedAction: 'Start Rescue Focus',
          targetTaskId: urgentTask.id
        });
      }

      if (tasks.filter(t => t.status !== 'completed').length > 4 && !activeRecs.some(r => r.id === 'rec-fallback-load')) {
        updated.push({
          id: 'rec-fallback-load',
          type: 'general',
          title: 'Heavy Backlog Congestion 📚',
          description: "You have multiple active targets. PriorAI recommends sorting by priority and hiding non-urgent goals.",
          severity: 'medium',
          suggestedAction: 'AI Sort'
        });
      }

      return updated.slice(0, 3);
    });
  };

  // API Call: Fetch Personalized AI Proactive Recommendations
  const fetchAIRecommendations = async () => {
    try {
      const res = await fetch('/api/gemini/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, habits })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.recommendations && data.recommendations.length > 0) {
          const recs = data.recommendations.map((r: any, idx: number) => ({
            id: `rec-${idx}-${Date.now()}`,
            ...r
          }));
          setAiRecommendations(recs);
        }
      } else {
        throw new Error("No response key");
      }
    } catch (e) {
      // Local fallback if server or key is not available
      const now = Date.now();
      const localRecommendations: AIRecommendation[] = [];
      const urgentTask = tasks.find(t => t.status !== 'completed' && (new Date(t.deadline).getTime() - now) < 6 * 60 * 60 * 1000);
      
      if (urgentTask) {
        localRecommendations.push({
          id: 'rec-fallback-urgent',
          type: 'urgency',
          title: 'Immediate Crash Threat! 🚨',
          description: `"${urgentTask.title}" has under 6 hours remaining. Start Rescue Focus Zone right now to save it.`,
          severity: 'high',
          suggestedAction: 'Start Rescue Focus',
          targetTaskId: urgentTask.id
        });
      }

      if (tasks.filter(t => t.status !== 'completed').length > 4) {
        localRecommendations.push({
          id: 'rec-fallback-load',
          type: 'general',
          title: 'Heavy Backlog Congestion 📚',
          description: "You have multiple active targets. PriorAI recommends sorting by priority and hiding non-urgent goals.",
          severity: 'medium',
          suggestedAction: 'AI Sort'
        });
      }

      setAiRecommendations(localRecommendations);
    }
  };

  // API Call: AI Prioritization Ranks
  const handleAIPrioritization = async () => {
    setIsAiPrioritizing(true);
    try {
      const activeTasks = tasks.filter(t => t.status !== 'completed');
      if (activeTasks.length === 0) return;

      const res = await fetch('/api/gemini/prioritize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: activeTasks })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.prioritizedTasks) {
          const updated = tasks.map(t => {
            const prioritizedItem = data.prioritizedTasks.find((pt: any) => pt.id === t.id);
            if (prioritizedItem) {
              return {
                ...t,
                aiPrioritizedRank: prioritizedItem.aiPrioritizedRank,
                aiRecommendation: prioritizedItem.aiRecommendation
              };
            }
            return t;
          });
          setTasks(updated);
        }
      } else {
        throw new Error("Failed prioritize");
      }
    } catch (e) {
      // Local fallback ranking algorithm
      const updated = [...tasks].map(t => {
        if (t.status === 'completed') return t;
        const timeDiffHrs = Math.max(0.1, (new Date(t.deadline).getTime() - Date.now()) / (1000 * 60 * 60));
        const importanceWeight = t.importance === 'high' ? 300 : t.importance === 'medium' ? 150 : 50;
        // Urgency score: lower timeDiff and higher importance weight yields high score
        const score = (importanceWeight) / (timeDiffHrs + 1);
        return { ...t, score };
      });
      
      // Sort and assign rank numbers
      const sorted = updated
        .filter(t => t.status !== 'completed')
        .sort((a, b) => (b as any).score - (a as any).score);

      const ranked = tasks.map(t => {
        const matchIdx = sorted.findIndex(s => s.id === t.id);
        if (matchIdx !== -1) {
          return {
            ...t,
            aiPrioritizedRank: matchIdx + 1,
            aiRecommendation: t.importance === 'high' 
              ? "Extremely urgent high impact item. Allocate focus blocks immediately."
              : "Moderate target. Work on this after higher rank bottlenecks are resolved."
          };
        }
        return t;
      });
      setTasks(ranked);
    } finally {
      setIsAiPrioritizing(false);
    }
  };

  // API Call: AI Milestone Breakdown
  const handleGenerateMilestones = async (task: Task) => {
    try {
      const res = await fetch('/api/gemini/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.milestones && data.milestones.length > 0) {
          const milestones: Milestone[] = data.milestones.map((m: any, idx: number) => ({
            id: `m-${task.id}-${idx}-${Date.now()}`,
            title: m.title,
            isCompleted: false
          }));

          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, milestones } : t));
        }
      } else {
        throw new Error("API Breakdown error");
      }
    } catch (e) {
      // Local fallback milestone breakdown
      const fallbackMilestones: Milestone[] = [
        { id: `m-f-1-${task.id}`, title: "Identify entry hurdle & open draft file", isCompleted: false },
        { id: `m-f-2-${task.id}`, title: "Block out distractions & complete 15m raw focus sprint", isCompleted: false },
        { id: `m-f-3-${task.id}`, title: "Check remaining criteria and execute wrap up", isCompleted: false }
      ];
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, milestones: fallbackMilestones } : t));
    }
  };

  // API Call: AI Auto-Scheduling Block
  const handleAutoScheduleAI = async () => {
    setIsAiScheduling(true);
    try {
      // We will let Gemini layout tasks or do a robust slot allocation
      const pending = tasks.filter(t => t.status !== 'completed');
      if (pending.length === 0) return;

      // In the interest of perfect UI responsiveness, let's create a beautiful schedule list
      const todayStr = new Date().toISOString().split('T')[0];
      const newBlocks: TimeBlock[] = [];
      let nextHour = 9; // starts at 9:00 AM

      pending.forEach((task, idx) => {
        if (nextHour > 21) return; // limit to 9:00 PM

        newBlocks.push({
          id: `tb-${task.id}-${idx}-${Date.now()}`,
          taskId: task.id,
          taskTitle: task.title,
          date: todayStr,
          startTime: `${nextHour.toString().padStart(2, '0')}:00`,
          endTime: `${(nextHour + 1).toString().padStart(2, '0')}:00`,
          category: task.category
        });
        nextHour += 2; // leave gaps for breaks
      });

      setTimeBlocks(prev => {
        // Clear old ones for today and add new structured ones
        const filtered = prev.filter(b => b.date !== todayStr);
        return [...filtered, ...newBlocks];
      });
    } catch (e) {
      console.error(e);
    } finally {
      // Simulate small loader delay for AI feel
      setTimeout(() => setIsAiScheduling(false), 800);
    }
  };

  // API Call: AI Coach Conversation
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsAiResponding(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg],
          tasks,
          currentTask: activeFocusTask
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.response) {
          setChatMessages((prev) => [
            ...prev,
            {
              id: `msg-ai-${Date.now()}`,
              sender: 'assistant',
              text: data.response,
              timestamp: new Date().toISOString()
            }
          ]);
        }
      } else {
        throw new Error("Chat failed");
      }
    } catch (e) {
      // Local coach fallback answers to sustain conversation
      let answer = "I am ready to assist. Let's make starting as frictionless as possible. What is one micro-sentence we can write down for this assignment?";
      if (text.toLowerCase().includes('overwhelmed') || text.toLowerCase().includes('panic')) {
        answer = "Overwhelm is real! Breathe in for 4 seconds, hold for 4, out for 4. Now, let's ignore the big picture. Let's work on just ONE single milestone for 10 minutes.";
      } else if (text.toLowerCase().includes('procrastinat')) {
        answer = "Procrastination is an emotional defense. It's safe to start a raw, unpolished first draft. Click 'RESCUE FOCUS ZONE' and let's get 15 minutes in.";
      }
      
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-ai-${Date.now()}`,
            sender: 'assistant',
            text: answer,
            timestamp: new Date().toISOString()
          }
        ]);
      }, 500);
    } finally {
      setIsAiResponding(false);
    }
  };

  // State triggers for adding/modifying elements
  const handleAddTask = async (newTask: Omit<Task, 'id' | 'createdAt' | 'milestones' | 'status'>) => {
    const task: Task = {
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString(),
      milestones: [],
      status: 'pending',
      ...newTask
    };
    setTasks(prev => [task, ...prev]);

    // Auto-sync to Google Calendar if configured
    if (gcalToken && autoSyncGCal) {
      setIsSyncingGCal(true);
      try {
        await createGoogleCalendarEvent(task, gcalToken);
        showGCalStatus(`Automatically synced "${task.title}" to Google Calendar!`, 'success');
      } catch (err: any) {
        console.error("GCal Sync Error:", err);
        showGCalStatus(`Failed to auto-sync to Google Calendar.`, 'error');
      } finally {
        setIsSyncingGCal(false);
      }
    }
  };

  const handleSmartAddTask = async (query: string): Promise<boolean> => {
    try {
      const currentLocalTime = new Date().toISOString();
      const res = await fetch('/api/gemini/parse-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, currentLocalTime })
      });

      if (!res.ok) {
        throw new Error("Failed to parse task with AI");
      }

      const data = await res.json();
      if (data && data.title) {
        // Construct ISO deadline
        const deadlineISO = new Date(`${data.deadlineDate}T${data.deadlineTime}`).toISOString();
        
        // Find category color
        const CATEGORIES = [
          { name: 'Studies', icon: '📚', color: '#3b82f6' },
          { name: 'Work', icon: '💼', color: '#10b981' },
          { name: 'Personal', icon: '🌱', color: '#8b5cf6' },
          { name: 'Finance', icon: '💰', color: '#f59e0b' },
          { name: 'Health', icon: '🏃', color: '#ec4899' },
          { name: 'Admin', icon: '⚙️', color: '#64748b' }
        ];
        const catObj = CATEGORIES.find(c => c.name === data.category) || CATEGORIES[5];
        const colorHex = catObj.color;

        await handleAddTask({
          title: data.title,
          description: `Smart added from prompt: "${query}"`,
          deadline: deadlineISO,
          importance: data.importance || 'medium',
          category: data.category || 'Personal',
          estimatedDuration: data.estimatedDuration || 60,
          colorHex
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error("Smart add error:", err);
      // Fallback parser
      const now = new Date();
      let title = query;
      let deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // default tomorrow
      
      if (query.toLowerCase().includes('tomorrow')) {
        title = query.replace(/tomorrow/gi, '').trim();
      }
      if (query.toLowerCase().includes('meeting')) {
        title = "Meeting";
      }

      await handleAddTask({
        title: title || 'Smart Task',
        description: `Quick added: "${query}"`,
        deadline: deadline.toISOString(),
        importance: 'medium',
        category: 'Personal',
        estimatedDuration: 60,
        colorHex: '#8b5cf6'
      });
      return true;
    }
  };

  const handleToggleTaskStatus = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const newStatus = t.status === 'completed' ? 'pending' : 'completed';
        return { ...t, status: newStatus };
      }
      return t;
    }));
  };

  const handleToggleMilestone = (taskId: string, milestoneId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updatedMilestones = t.milestones.map(m => m.id === milestoneId ? { ...m, isCompleted: !m.isCompleted } : m);
        // If all milestones completed, optionally set task as complete
        const allDone = updatedMilestones.length > 0 && updatedMilestones.every(m => m.isCompleted);
        return {
          ...t,
          milestones: updatedMilestones,
          status: allDone ? 'completed' : t.status
        };
      }
      return t;
    }));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setTimeBlocks(prev => prev.filter(b => b.taskId !== taskId));
  };

  const handleAddHabit = (newHabit: Omit<Habit, 'id' | 'streak' | 'maxStreak' | 'lastCompletedDate' | 'history' | 'createdAt'>) => {
    const habit: Habit = {
      id: `habit-${Date.now()}`,
      streak: 0,
      maxStreak: 0,
      lastCompletedDate: null,
      history: {},
      createdAt: new Date().toISOString(),
      ...newHabit
    };
    setHabits(prev => [habit, ...prev]);
  };

  const handleToggleHabit = (habitId: string, dateStr: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        const isCurrentlyCompleted = !!h.history[dateStr];
        const newHistory = { ...h.history };

        if (isCurrentlyCompleted) {
          delete newHistory[dateStr];
        } else {
          newHistory[dateStr] = true;
        }

        // Calculate current streak
        let currentStreak = h.streak;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // Simple dynamic streak tracking
        if (!isCurrentlyCompleted) {
          if (dateStr === new Date().toISOString().split('T')[0]) {
            currentStreak = h.lastCompletedDate === yesterdayStr ? h.streak + 1 : 1;
          }
        } else {
          if (dateStr === new Date().toISOString().split('T')[0]) {
            currentStreak = Math.max(0, h.streak - 1);
          }
        }

        const maxStreak = Math.max(h.maxStreak, currentStreak);

        return {
          ...h,
          history: newHistory,
          streak: currentStreak,
          maxStreak,
          lastCompletedDate: !isCurrentlyCompleted ? dateStr : h.lastCompletedDate
        };
      }
      return h;
    }));
  };

  const handleAddTimeBlock = (block: Omit<TimeBlock, 'id'>) => {
    setTimeBlocks(prev => [
      ...prev,
      {
        id: `tb-${Date.now()}`,
        ...block
      }
    ]);
  };

  const handleDeleteTimeBlock = (blockId: string) => {
    setTimeBlocks(prev => prev.filter(b => b.id !== blockId));
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A] font-sans antialiased pb-16" id="app-root-shell">
      {/* Immersive Focus Zone Overlay */}
      {activeFocusTask && (
        <FocusZone
          task={activeFocusTask}
          onClose={() => setActiveFocusTask(null)}
          onToggleMilestone={handleToggleMilestone}
          onCompleteTask={handleToggleTaskStatus}
        />
      )}

      {/* Top Alert Header - Neo Brutalist style */}
      <header className="h-20 bg-white px-4 md:px-8 flex items-center justify-between border-b-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 border-2 border-black rounded-xl overflow-hidden rotate-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white">
            <img 
              src="/src/assets/images/priorai_logo_1782576520891.jpg" 
              alt="PriorAI Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#1A1A1A] font-display leading-none">PriorAI</h1>
            <p className="text-[10px] text-slate-500 font-mono font-bold mt-0.5">Life Saver Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex px-4 py-2 bg-[#FFE66D] border-2 border-black rounded-full font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[#1A1A1A]">
            RESCUE ACTIVE: 24/7
          </div>
          <button
            id="header-create-task-btn"
            onClick={() => setShowTaskForm(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#FF6B6B] hover:bg-[#e05353] text-white text-xs font-black rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </button>
        </div>
      </header>

      {/* Main Layout Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Navigation panel */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Menu Buttons Card */}
          <div className="bg-white border-4 border-black p-4 rounded-[24px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" id="main-navigation-panel">
            <h3 className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider px-2 mb-3 hidden lg:block">
              Navigation Engine
            </h3>
            <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none">
              {[
                { id: 'dashboard', label: '📊 Dashboard', desc: 'Real-time Alerts' },
                { id: 'tasks', label: '🚀 Escape Backlog', desc: 'AI Priorities & Plan' },
                { id: 'calendar', label: '📅 Calendar Blocker', desc: 'Google Sync & Slots' },
                { id: 'pillars', label: '🌱 Pillars & Habits', desc: 'Daily Routine Goals' },
                { id: 'chat', label: '💬 AI Coach Room', desc: 'Proactive Voice Copilot' },
                { id: 'hub', label: '⚙️ AI Capability Hub', desc: '8 Active Modules' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  id={`nav-btn-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-shrink-0 text-left px-3.5 py-2.5 rounded-xl border-2 font-black transition-all flex flex-col justify-center min-w-[130px] lg:min-w-0 lg:w-full ${
                    activeTab === tab.id 
                      ? 'bg-[#FFE66D] text-black border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] lg:-translate-y-0.5' 
                      : 'border-transparent text-slate-700 hover:text-black hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-black tracking-tight">{tab.label}</span>
                  <span className="text-[8px] text-slate-500 font-mono font-black mt-0.5 hidden lg:block">{tab.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Metrics stats widget in brutalist design - displayed under the navigation on desktop */}
          <div className="hidden lg:block bg-white border-4 border-black p-4 rounded-[24px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-3" id="quick-metrics-sidebar">
            <h4 className="text-[10px] font-black uppercase tracking-tight text-slate-400 font-mono">
              ⚡ Defiance Status
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#4ECDC4]/20 border border-black p-2 rounded-xl">
                <span className="text-[9px] font-black uppercase text-slate-500 block leading-none">Completed</span>
                <span className="text-xl font-black text-black leading-none inline-block mt-1 font-display">
                  {tasks.filter(t => t.status === 'completed').length}
                </span>
              </div>
              <div className="bg-[#FF6B6B]/20 border border-black p-2 rounded-xl">
                <span className="text-[9px] font-black uppercase text-slate-500 block leading-none">In Danger</span>
                <span className="text-xl font-black text-[#FF6B6B] leading-none inline-block mt-1 font-display">
                  {tasks.filter(t => t.status !== 'completed' && t.importance === 'high').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area: Renders the active dedicated page */}
        <div className="lg:col-span-9 space-y-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-200" id="page-dashboard">
              {/* Dynamic Welcome Greeting Card */}
              <div className="bg-[#4ECDC4] border-4 border-black p-6 rounded-[24px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-black relative overflow-hidden">
                <div className="absolute right-4 top-4 h-16 w-16 opacity-10">
                  <Sparkles className="h-full w-full" />
                </div>
                <h2 className="text-2xl font-black font-display leading-tight">Welcome to PriorAI Copilot</h2>
                <p className="text-xs font-medium text-black/80 mt-1 max-w-xl">
                  Procrastination isn't laziness; it's deadline anxiety. Your proactive companion has analyzing engines online, keeping watch 24/7 so you take friction-free steps.
                </p>
                <div className="flex flex-wrap gap-4 mt-4 font-mono text-[10px] font-bold bg-white/40 border border-black/10 px-3 py-2 rounded-xl w-fit">
                  <span>⏰ CURRENT LOCAL TIME: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>📅 OUTSTANDING DEADLINES: {tasks.filter(t => t.status !== 'completed').length}</span>
                  <span>🌱 HABITS PENDING: {habits.filter(h => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    return !h.history[todayStr];
                  }).length}</span>
                </div>
              </div>

              {/* Proactive AI Warnings Alert banner - styled beautifully in neo-brutalist */}
              {aiRecommendations.length > 0 && (
                <div 
                  className="bg-white border-4 border-[#1A1A1A] p-5 rounded-[24px] shadow-[6px_6px_0px_0px_rgba(255,107,107,1)] flex items-start gap-4" 
                  id="dashboard-proactive-warnings"
                >
                  <div className="w-10 h-10 bg-[#FFE66D] border-2 border-black rounded-xl flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                    <ShieldAlert className="h-6 w-6 text-black" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="text-xs font-black uppercase text-[#1A1A1A] tracking-wider font-mono">
                      🚨 PriorAI Proactive Deadline Rescue warnings
                    </h4>
                    <div className="flex flex-col gap-2 mt-2">
                      {aiRecommendations.map((rec) => (
                        <div 
                          key={rec.id} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/10 pb-2 last:border-0 last:pb-0"
                        >
                          <p className="text-xs font-medium text-[#1A1A1A]">
                            <span className="font-black text-[#FF6B6B]">{rec.title}:</span> {rec.description}
                          </p>
                          {rec.suggestedAction && (
                            <button
                              id={`rec-act-btn-dash-${rec.id}`}
                              onClick={() => {
                                const actionLower = rec.suggestedAction.toLowerCase();
                                if (rec.targetTaskId) {
                                  const task = tasks.find(t => t.id === rec.targetTaskId);
                                  if (task) {
                                    setActiveFocusTask(task);
                                    setActiveTab('tasks');
                                    return;
                                  }
                                }
                                
                                // Direct routing depending on action labels
                                if (actionLower.includes('habit') || actionLower.includes('log') || actionLower.includes('pillar')) {
                                  setActiveTab('pillars');
                                } else if (actionLower.includes('sort') || actionLower.includes('prioritize') || actionLower.includes('rank')) {
                                  handleAIPrioritization();
                                  setActiveTab('tasks');
                                } else if (actionLower.includes('schedule') || actionLower.includes('block') || actionLower.includes('calendar')) {
                                  setActiveTab('calendar');
                                } else {
                                  setActiveTab('tasks');
                                }
                              }}
                              className="text-[10px] font-black text-white bg-[#FF6B6B] hover:bg-[#e05353] border-2 border-black px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 shrink-0"
                            >
                              {rec.suggestedAction}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Bento Grid layout summarizing all primary sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="dashboard-bento-grid">
                {/* Section 1: Tasks */}
                <div className="bg-white border-4 border-black p-5 rounded-[24px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 bg-[#4ECDC4] border-2 border-black rounded-lg flex items-center justify-center text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                        🚀
                      </div>
                      <h3 className="text-sm font-black font-display text-black">Intelligent Task List</h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Defeat deadline-stress and prioritize with AI. Currently tracking <span className="font-bold text-black">{tasks.length} tasks</span>.
                    </p>
                    {tasks.filter(t => t.status !== 'completed').length > 0 ? (
                      <div className="p-3 bg-slate-50 border-2 border-black rounded-xl text-xs space-y-1.5">
                        <p className="font-mono text-[9px] text-slate-400 font-bold uppercase tracking-wider">Urgent Focus Target</p>
                        <p className="font-black text-black truncate">
                          {tasks.filter(t => t.status !== 'completed').sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0].title}
                        </p>
                        <p className="text-[10px] text-red-600 font-bold font-mono">
                          🚨 Due {new Date(tasks.filter(t => t.status !== 'completed').sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0].deadline).toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No pending tasks! Create a new task to get started.</p>
                    )}
                  </div>
                  <button
                    id="dash-goto-tasks"
                    onClick={() => setActiveTab('tasks')}
                    className="w-full mt-4 py-2 bg-white hover:bg-slate-50 border-2 border-black font-black text-xs rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-center transition-all"
                  >
                    Go to Procrastination Escape →
                  </button>
                </div>

                {/* Section 2: Calendar */}
                <div className="bg-white border-4 border-black p-5 rounded-[24px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 bg-[#FFE66D] border-2 border-black rounded-lg flex items-center justify-center text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                        📅
                      </div>
                      <h3 className="text-sm font-black font-display text-black">Calendar Blocker</h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Auto-generate time slots to force focus. Currently booked <span className="font-bold text-black">{timeBlocks.length} focus blocks</span>.
                    </p>
                    <div className="p-3 bg-slate-50 border-2 border-black rounded-xl text-xs space-y-1">
                      <p className="font-mono text-[9px] text-slate-400 font-bold uppercase tracking-wider">Calendar API Connection</p>
                      <p className="font-black text-black flex items-center gap-1.5 mt-1">
                        <span className={`inline-block h-2 w-2 rounded-full ${gcalUser ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {gcalUser ? "Google Account Connected" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  <button
                    id="dash-goto-calendar"
                    onClick={() => setActiveTab('calendar')}
                    className="w-full mt-4 py-2 bg-white hover:bg-slate-50 border-2 border-black font-black text-xs rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-center transition-all"
                  >
                    Manage Calendar slots →
                  </button>
                </div>

                {/* Section 3: Habits */}
                <div className="bg-white border-4 border-black p-5 rounded-[24px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 bg-[#FF6B6B] border-2 border-black rounded-lg flex items-center justify-center text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                        🌱
                      </div>
                      <h3 className="text-sm font-black font-display text-black">Consistency Pillars</h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Build micro routines that stick. Tracking <span className="font-bold text-black">{habits.length} consistency habits</span>.
                    </p>
                    <div className="p-3 bg-slate-50 border-2 border-black rounded-xl text-xs">
                      <p className="font-mono text-[9px] text-slate-400 font-bold uppercase tracking-wider">Streaks leaderboard</p>
                      <p className="font-black text-black mt-1">
                        🏆 Top Streak: {Math.max(...habits.map(h => h.streak), 0)} days consistency
                      </p>
                    </div>
                  </div>
                  <button
                    id="dash-goto-pillars"
                    onClick={() => setActiveTab('pillars')}
                    className="w-full mt-4 py-2 bg-white hover:bg-slate-50 border-2 border-black font-black text-xs rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-center transition-all"
                  >
                    Review Daily Habits →
                  </button>
                </div>

                {/* Section 4: AI Coach */}
                <div className="bg-white border-4 border-black p-5 rounded-[24px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 bg-purple-500 border-2 border-black rounded-lg flex items-center justify-center text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                        💬
                      </div>
                      <h3 className="text-sm font-black font-display text-black">Conversational Coach</h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Interactive speech support for panic triage. Chat with your proactive tutor or prompt voice actions.
                    </p>
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs font-medium text-purple-950">
                      ✨ "I am feeling overwhelmed with my assignment due tonight..." — Try telling this to your AI coach.
                    </div>
                  </div>
                  <button
                    id="dash-goto-chat"
                    onClick={() => setActiveTab('chat')}
                    className="w-full mt-4 py-2 bg-[#FFE66D] hover:bg-[#ebd04e] border-2 border-black font-black text-xs rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-center transition-all"
                  >
                    Open AI Chat Room →
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-6 animate-in fade-in duration-200" id="page-tasks">
              <div className="flex items-center justify-between border-b-2 border-black pb-3">
                <div>
                  <h2 className="text-xl font-black font-display">🚀 Procrastination Escape Engine</h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">Tasks list & intelligent AI prioritization rankings</p>
                </div>
                <button
                  id="tasks-page-new-btn"
                  onClick={() => setShowTaskForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6B6B] hover:bg-[#e05353] text-white text-xs font-black rounded-xl border border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Task</span>
                </button>
              </div>

              <TaskList
                tasks={tasks}
                onToggleTaskStatus={handleToggleTaskStatus}
                onToggleMilestone={handleToggleMilestone}
                onDeleteTask={handleDeleteTask}
                onGenerateMilestones={handleGenerateMilestones}
                onStartFocus={setActiveFocusTask}
                isAiLoading={isAiPrioritizing}
                onPrioritizeAI={handleAIPrioritization}
                onSmartAdd={handleSmartAddTask}
              />
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="space-y-6 animate-in fade-in duration-200" id="page-calendar">
              <div className="border-b-2 border-black pb-3">
                <h2 className="text-xl font-black font-display">📅 Daily Calendar Blocker & API Sync</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Protect focus slots and synchronize schedule blocks in real life</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Time Blocks */}
                <div className="lg:col-span-8">
                  <SchedulePlanner
                    tasks={tasks}
                    timeBlocks={timeBlocks}
                    onAddTimeBlock={handleAddTimeBlock}
                    onDeleteTimeBlock={handleDeleteTimeBlock}
                    onAutoScheduleAI={handleAutoScheduleAI}
                    isScheduling={isAiScheduling}
                  />
                </div>

                {/* Integration card */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Google Calendar Sync Widget */}
                  <div 
                    className="bg-white border-4 border-black p-5 rounded-[24px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4" 
                    id="calendar-gcal-integration-card"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 bg-[#FFE66D] border-2 border-black rounded-lg flex items-center justify-center text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                        <Calendar className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-black font-display leading-none">Google Calendar</h4>
                        <p className="text-[9px] text-slate-500 font-mono font-bold mt-0.5">Real-time Sync</p>
                      </div>
                    </div>

                    {gcalUser ? (
                      <div className="space-y-3">
                        <div className="p-2.5 bg-slate-50 border-2 border-black rounded-xl text-xs font-mono font-bold text-slate-700 flex flex-col gap-1">
                          <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Connected Account</span>
                          <span className="truncate">{gcalUser.email}</span>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer p-1">
                          <input
                            id="auto-sync-checkbox"
                            type="checkbox"
                            checked={autoSyncGCal}
                            onChange={(e) => setAutoSyncGCal(e.target.checked)}
                            className="h-4 w-4 text-[#4ECDC4] focus:ring-[#4ECDC4] border-2 border-black rounded cursor-pointer"
                          />
                          <span className="text-xs font-bold text-black select-none">Auto-sync new tasks</span>
                        </label>

                        <button
                          id="disconnect-gcal-btn"
                          onClick={handleDisconnectGCal}
                          className="w-full py-2 bg-[#FF6B6B] hover:bg-[#e05353] text-white text-xs font-black rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0.5 transition-transform"
                        >
                          Disconnect API
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          Connect your Google Calendar to automatically add task slots and stay synchronized in real life.
                        </p>
                        <button
                          id="connect-gcal-btn"
                          onClick={handleConnectGCal}
                          className="w-full py-2.5 bg-[#4ECDC4] hover:bg-[#3dbcb3] text-black text-xs font-black rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0.5 transition-transform flex items-center justify-center gap-2"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Connect Calendar</span>
                        </button>
                      </div>
                    )}

                    {isSyncingGCal && (
                      <div className="text-[10px] text-[#4ECDC4] font-black font-mono animate-pulse flex items-center gap-1 bg-[#4ECDC4]/10 p-1.5 rounded-lg border border-[#4ECDC4]/20 justify-center">
                        <span>⚡ Syncing with Google Calendar...</span>
                      </div>
                    )}

                    {gcalStatusMsg && (
                      <div className={`text-[10px] font-black font-mono p-2 rounded-lg border-2 border-black text-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                        gcalStatusMsg.type === 'success' 
                          ? 'bg-[#E8FDF5] text-emerald-800' 
                          : gcalStatusMsg.type === 'error' 
                            ? 'bg-[#FDF2F2] text-red-800' 
                            : 'bg-[#F4F2FF] text-slate-800'
                      }`}>
                        {gcalStatusMsg.text}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pillars' && (
            <div className="space-y-6 animate-in fade-in duration-200" id="page-pillars">
              <div className="border-b-2 border-black pb-3">
                <h2 className="text-xl font-black font-display">🌱 Consistency Pillars & Daily Habits</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Maintain consistent routines to build cognitive momentum</p>
              </div>

              <HabitTracker
                habits={habits}
                onAddHabit={handleAddHabit}
                onToggleHabit={handleToggleHabit}
              />
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="space-y-6 animate-in fade-in duration-200" id="page-chat">
              <div className="border-b-2 border-black pb-3">
                <h2 className="text-xl font-black font-display">💬 AI Companion Coach & Voice Assistant</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Talk or speak directly with your stress-relief planning copilot</p>
              </div>

              <div className="max-w-4xl mx-auto">
                <AIChatCompanion
                  messages={chatMessages}
                  onSendMessage={handleSendMessage}
                  tasks={tasks}
                  activeTask={activeFocusTask}
                  isGenerating={isAiResponding}
                />
              </div>
            </div>
          )}

          {activeTab === 'hub' && (
            <div className="space-y-6 animate-in fade-in duration-200" id="page-hub">
              <div className="border-b-2 border-black pb-3">
                <h2 className="text-xl font-black font-display">⚙️ AI Copilot Capabilities Hub</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Complete diagnostics, control centers, and voice-enablement instructions</p>
              </div>

              <div className="max-w-3xl mx-auto">
                <AICapabilityHub
                  tasks={tasks}
                  habits={habits}
                  timeBlocks={timeBlocks}
                  gcalUser={gcalUser}
                  autoSyncGCal={autoSyncGCal}
                  onPrioritizeAI={handleAIPrioritization}
                  onAutoScheduleAI={handleAutoScheduleAI}
                  onConnectGCal={handleConnectGCal}
                  onTriggerVoiceInfo={() => {
                    handleSendMessage("Explain how to use voice-enabled assistance commands to capture, plan or query tasks.");
                    setActiveTab('chat');
                  }}
                  activeFocusTask={activeFocusTask}
                  setActiveTab={setActiveTab}
                  isAiPrioritizing={isAiPrioritizing}
                  isAiScheduling={isAiScheduling}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Task Creation Modal */}
      {showTaskForm && (
        <TaskForm
          onAddTask={handleAddTask}
          onClose={() => setShowTaskForm(false)}
        />
      )}
    </div>
  );
}
