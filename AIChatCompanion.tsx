import React, { useState } from 'react';
import { 
  Calendar, Clock, AlertTriangle, CheckCircle, Circle, 
  Trash2, Sparkles, ChevronDown, ChevronUp, Play, Info
} from 'lucide-react';
import { Task, Milestone } from '../types';

interface TaskListProps {
  tasks: Task[];
  onToggleTaskStatus: (taskId: string) => void;
  onToggleMilestone: (taskId: string, milestoneId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onGenerateMilestones: (task: Task) => Promise<void>;
  onStartFocus: (task: Task) => void;
  isAiLoading: boolean;
  onPrioritizeAI: () => void;
  onSmartAdd: (query: string) => Promise<boolean>;
}

export default function TaskList({
  tasks,
  onToggleTaskStatus,
  onToggleMilestone,
  onDeleteTask,
  onGenerateMilestones,
  onStartFocus,
  isAiLoading,
  onPrioritizeAI,
  onSmartAdd
}: TaskListProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'importance' | 'aiRank'>('deadline');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);

  const [quickAddText, setQuickAddText] = useState('');
  const [isSmartAdding, setIsSmartAdding] = useState(false);

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddText.trim()) return;

    setIsSmartAdding(true);
    try {
      const success = await onSmartAdd(quickAddText.trim());
      if (success) {
        setQuickAddText('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSmartAdding(false);
    }
  };

  // Helper: Format distance to deadline in a friendly human way
  const getDeadlineText = (deadlineStr: string) => {
    const now = new Date();
    const deadline = new Date(deadlineStr);
    const diffMs = deadline.getTime() - now.getTime();
    
    if (diffMs < 0) {
      const hoursOverdue = Math.abs(Math.round(diffMs / (1000 * 60 * 60)));
      if (hoursOverdue < 24) {
        return `Overdue by ${hoursOverdue} hrs ⚠️`;
      }
      return `Overdue by ${Math.round(hoursOverdue / 24)} days ⚠️`;
    }

    const diffMins = Math.round(diffMs / (1000 * 60));
    if (diffMins < 60) {
      return `Due in ${diffMins} mins! ⚡`;
    }

    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) {
      return `Due in ${diffHours} hours`;
    }

    const diffDays = Math.round(diffHours / 24);
    return `Due in ${diffDays} days`;
  };

  const handleBreakdownClick = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setLoadingTaskId(task.id);
    try {
      await onGenerateMilestones(task);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTaskId(null);
    }
  };

  // Filter categories
  const categories = ['all', ...Array.from(new Set(tasks.map(t => t.category)))];

  // Process and sort tasks
  const filteredTasks = tasks.filter(task => {
    const matchesCat = filterCategory === 'all' || task.category === filterCategory;
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'completed' && task.status === 'completed') ||
      (filterStatus === 'pending' && task.status !== 'completed');
    return matchesCat && matchesStatus;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'aiRank') {
      const rankA = a.aiPrioritizedRank ?? 999;
      const rankB = b.aiPrioritizedRank ?? 999;
      return rankA - rankB;
    }
    if (sortBy === 'importance') {
      const importanceMap = { high: 3, medium: 2, low: 1 };
      return importanceMap[b.importance] - importanceMap[a.importance];
    }
    // Default: Sort by nearest deadline
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Smart AI Quick Add Bar */}
      <form 
        onSubmit={handleQuickAddSubmit}
        className="bg-white border-4 border-black p-5 rounded-[24px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row items-center gap-4"
        id="smart-quick-add-form"
      >
        <div className="flex-1 w-full">
          <label className="block text-[10px] font-black text-[#FF6B6B] uppercase tracking-wider mb-1.5 font-mono flex items-center gap-1">
            <Sparkles className="h-3 w-3 fill-current animate-pulse" />
            <span>Smart AI Quick Add Task</span>
          </label>
          <input
            id="smart-quick-add-input"
            type="text"
            disabled={isSmartAdding}
            value={quickAddText}
            onChange={(e) => setQuickAddText(e.target.value)}
            placeholder='Try: "tomorrow 2 pm study meeting with bio group" or "next monday maths assignment"...'
            className="w-full px-4 py-2.5 bg-[#FFFDF6] border-2 border-black rounded-xl text-black font-black text-xs sm:text-sm placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#FF6B6B]"
          />
        </div>
        <button
          id="smart-quick-add-submit-btn"
          type="submit"
          disabled={isSmartAdding || !quickAddText.trim()}
          className="w-full sm:w-auto self-end px-5 py-2.5 bg-[#FFE66D] hover:bg-[#ebd04e] disabled:bg-slate-100 disabled:text-slate-400 border-2 border-black text-black text-xs font-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shrink-0 flex items-center justify-center gap-1.5"
        >
          {isSmartAdding ? (
            <>
              <div className="h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span>AI Parsing...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 fill-current" />
              <span>Smart Add</span>
            </>
          )}
        </button>
      </form>

      {/* Filters and Controls - Neo Brutalist styled card */}
      <div 
        id="task-list-filters"
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border-4 border-black p-5 rounded-[24px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 font-mono">
              Category
            </label>
            <select
              id="filter-category-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 bg-white border-2 border-black rounded-xl text-slate-800 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-[#FF6B6B]"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? '📁 All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 font-mono">
              Status
            </label>
            <select
              id="filter-status-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-white border-2 border-black rounded-xl text-slate-800 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-[#FF6B6B]"
            >
              <option value="all">🔍 All Statuses</option>
              <option value="pending">⏳ Pending</option>
              <option value="completed">✅ Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 font-mono">
              Sort By
            </label>
            <select
              id="sort-by-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-white border-2 border-black rounded-xl text-slate-800 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-[#FF6B6B]"
            >
              <option value="deadline">⏰ Closing Deadline</option>
              <option value="importance">🔥 Importance</option>
              <option value="aiRank">🧠 AI Smart Rank</option>
            </select>
          </div>
        </div>

        <button
          id="ai-prioritize-btn"
          onClick={onPrioritizeAI}
          disabled={isAiLoading || tasks.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#4ECDC4] hover:bg-[#3dbcb3] disabled:bg-slate-200 disabled:text-slate-500 border-2 border-black text-black text-xs font-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
        >
          <Sparkles className={`h-4 w-4 ${isAiLoading ? 'animate-spin' : ''}`} />
          <span>{isAiLoading ? 'Recalculating...' : 'AI Rank My Tasks'}</span>
        </button>
      </div>

      {/* Task Cards Grid */}
      <div className="space-y-4" id="task-list-container">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-12 bg-white border-4 border-dashed border-slate-300 rounded-[24px]">
            <Calendar className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 font-bold">No tasks found matching your filter.</p>
            <p className="text-xs text-slate-500 mt-1">Add a task above to start rescuing your goals!</p>
          </div>
        ) : (
          sortedTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isOverdue = new Date(task.deadline).getTime() < Date.now() && !isCompleted;
            const isExpanded = expandedTask === task.id;
            const milestonesDone = task.milestones.filter(m => m.isCompleted).length;
            const milestonesTotal = task.milestones.length;

            // Neo Brutalist highlight styles
            let cardBg = 'bg-white';
            let cardBorder = 'border-2 border-black';
            let shadowColor = 'shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]';
            
            if (isCompleted) {
              cardBg = 'bg-[#F7F7F7]';
              cardBorder = 'border-2 border-slate-400';
              shadowColor = 'shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] opacity-70';
            } else if (isOverdue) {
              cardBg = 'bg-[#FF6B6B]/10';
              cardBorder = 'border-2 border-[#FF6B6B]';
              shadowColor = 'shadow-[4px_4px_0px_0px_rgba(255,107,107,1)] hover:shadow-[6px_6px_0px_0px_rgba(255,107,107,1)]';
            } else if (task.importance === 'high') {
              cardBg = 'bg-[#FFE66D]/10';
              cardBorder = 'border-2 border-black';
              shadowColor = 'shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:shadow-[6px_6px_0px_0px_rgba(255,107,107,1)]';
            }

            return (
              <div
                key={task.id}
                id={`task-card-${task.id}`}
                onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                className={`group rounded-2xl transition-all duration-150 cursor-pointer overflow-hidden ${cardBg} ${cardBorder} ${shadowColor} hover:-translate-y-0.5`}
              >
                {/* Header Row */}
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <button
                      id={`complete-task-btn-${task.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTaskStatus(task.id);
                      }}
                      className="mt-0.5 transition rounded-full focus:outline-hidden"
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6 text-emerald-500 fill-emerald-500/10" />
                      ) : (
                        <Circle className="h-6 w-6 text-slate-400 hover:text-black" />
                      )}
                    </button>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Custom Color Dot */}
                        <span 
                          className="h-3 w-3 rounded-full border border-black inline-block"
                          style={{ backgroundColor: task.colorHex || '#3b82f6' }}
                        />
                        <span className="text-[10px] font-black text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-lg">
                          {task.category}
                        </span>
                        
                        {/* AI Priority badge */}
                        {task.aiPrioritizedRank && (
                          <span className="text-[10px] font-black text-black bg-[#FFE66D] border border-black px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                            <Sparkles className="h-3 w-3 text-amber-500 fill-current" />
                            <span>AI Rank #{task.aiPrioritizedRank}</span>
                          </span>
                        )}

                        {/* Importance tag */}
                        {task.importance === 'high' && (
                          <span className="text-[10px] font-black text-white bg-[#FF6B6B] border border-black px-2.5 py-0.5 rounded-lg shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                            🔥 High Impact
                          </span>
                        )}
                      </div>

                      <h3 className={`text-base font-black text-[#1A1A1A] tracking-tight ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                        {task.title}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-1 font-medium">
                        {task.description || "No action context provided."}
                      </p>
                    </div>
                  </div>

                  {/* Actions / Meta */}
                  <div className="flex flex-col items-end gap-2 text-right shrink-0">
                    <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-black ${
                      isCompleted 
                        ? 'bg-slate-100 text-slate-500'
                        : isOverdue
                          ? 'bg-[#FF6B6B]/20 text-[#FF6B6B]'
                          : task.importance === 'high'
                            ? 'bg-[#FFE66D]/30 text-black'
                            : 'bg-white text-slate-700'
                    }`}>
                      <Clock className="h-3.5 w-3.5" />
                      <span>{getDeadlineText(task.deadline)}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        id={`delete-task-btn-${task.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTask(task.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-[#FF6B6B] hover:bg-slate-100 border border-transparent hover:border-black rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      
                      <button className="p-1 text-slate-400 hover:text-black border border-transparent rounded-lg transition-colors">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI Recommendation Alert */}
                {task.aiRecommendation && !isCompleted && (
                  <div className="mx-5 mb-4 p-3.5 bg-[#4ECDC4]/10 border-2 border-black rounded-xl flex gap-3 items-start shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <Sparkles className="h-4 w-4 text-[#4ECDC4] fill-current shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-800 font-medium">
                      <span className="font-black text-[#4ECDC4] underline">AI Advice:</span> {task.aiRecommendation}
                    </p>
                  </div>
                )}

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div 
                    id={`task-expanded-${task.id}`}
                    className="border-t-2 border-black bg-[#F7F7F7] p-5 space-y-4 animate-in slide-in-from-top-1 duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Progress Bar */}
                    {milestonesTotal > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-black text-slate-700">
                          <span>Action Plan Progress</span>
                          <span>{milestonesDone}/{milestonesTotal} Milestones ({Math.round((milestonesDone / milestonesTotal) * 100)}%)</span>
                        </div>
                        <div className="h-3 w-full bg-white border-2 border-black rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#4ECDC4] border-r-2 border-black transition-all duration-300"
                            style={{ width: `${(milestonesDone / milestonesTotal) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Milestones Checklist */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-[#1A1A1A] uppercase tracking-wider flex items-center justify-between">
                        <span>Milestones & Action Steps</span>
                        <span className="text-slate-500 text-[10px] lowercase italic font-normal font-mono">Auto-generated by AI</span>
                      </h4>

                      {milestonesTotal === 0 ? (
                        <div className="text-center py-6 bg-white border-2 border-dashed border-slate-300 rounded-xl space-y-3">
                          <p className="text-xs text-slate-500 font-medium">No action milestones have been generated yet for this task.</p>
                          <button
                            id={`generate-milestones-btn-${task.id}`}
                            onClick={(e) => handleBreakdownClick(e, task)}
                            disabled={loadingTaskId === task.id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF6B6B] hover:bg-[#e05353] disabled:bg-slate-200 text-white text-xs font-black rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>{loadingTaskId === task.id ? 'Structuring Action Plan...' : 'Build AI Rescue Milestones'}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {task.milestones.map((milestone) => (
                            <div 
                              key={milestone.id}
                              onClick={() => onToggleMilestone(task.id, milestone.id)}
                              className="flex items-center justify-between px-3 py-2.5 bg-white border-2 border-black rounded-xl hover:bg-slate-50 transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <button className="text-slate-500 hover:text-black transition">
                                  {milestone.isCompleted ? (
                                    <CheckCircle className="h-4.5 w-4.5 text-emerald-500 fill-emerald-500/10" />
                                  ) : (
                                    <Circle className="h-4.5 w-4.5 text-slate-400" />
                                  )}
                                </button>
                                <span className={`text-xs font-bold text-[#1A1A1A] ${milestone.isCompleted ? 'line-through text-slate-400 font-medium' : ''}`}>
                                  {milestone.title}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Rescue Mode launch */}
                    {!isCompleted && (
                      <div className="pt-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-t-2 border-black/10">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          <Info className="h-4 w-4 text-amber-500 shrink-0" />
                          <span>Launch Panic Rescue Focus mode for high-intensity work blocks.</span>
                        </div>
                        <button
                          id={`start-focus-btn-${task.id}`}
                          onClick={() => onStartFocus(task)}
                          className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#FF6B6B] hover:bg-[#e05353] text-white text-xs font-black rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] text-center shrink-0"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>RESCUE FOCUS ZONE</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
