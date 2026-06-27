export interface Milestone {
  id: string;
  title: string;
  isCompleted: boolean;
  deadline?: string; // ISO date string
}

export type ImportanceLevel = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'active' | 'completed' | 'overdue';

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string; // ISO date string
  importance: ImportanceLevel;
  category: string;
  estimatedDuration: number; // in minutes
  status: TaskStatus;
  milestones: Milestone[];
  aiPrioritizedRank?: number;
  aiRecommendation?: string;
  colorHex?: string;
  createdAt: string;
}

export interface Habit {
  id: string;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly';
  category: string;
  streak: number;
  maxStreak: number;
  lastCompletedDate: string | null; // YYYY-MM-DD
  history: Record<string, boolean>; // 'YYYY-MM-DD' -> true
  createdAt: string;
}

export interface AIRecommendation {
  id: string;
  type: 'urgency' | 'schedule' | 'general';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestedAction?: string;
  targetTaskId?: string;
  isDismissed?: boolean;
}

export interface TimeBlock {
  id: string;
  taskId: string;
  taskTitle: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  category: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}
