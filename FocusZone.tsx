import React, { useState } from 'react';
import { Calendar, Clock, AlertCircle, Plus, Tag, X, Sparkles } from 'lucide-react';
import { Task, ImportanceLevel } from '../types';

interface TaskFormProps {
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'milestones' | 'status'>) => void;
  onClose: () => void;
}

const CATEGORIES = [
  { name: 'Studies', icon: '📚', color: '#3b82f6' },
  { name: 'Work', icon: '💼', color: '#10b981' },
  { name: 'Personal', icon: '🌱', color: '#8b5cf6' },
  { name: 'Finance', icon: '💰', color: '#f59e0b' },
  { name: 'Health', icon: '🏃', color: '#ec4899' },
  { name: 'Admin', icon: '⚙️', color: '#64748b' }
];

export default function TaskForm({ onAddTask, onClose }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('23:59');
  const [importance, setImportance] = useState<ImportanceLevel>('medium');
  const [category, setCategory] = useState('Studies');
  const [duration, setDuration] = useState(60); // minutes

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deadlineDate) return;

    const deadlineISO = new Date(`${deadlineDate}T${deadlineTime}`).toISOString();
    const selectedCatObj = CATEGORIES.find(c => c.name === category);
    const colorHex = selectedCatObj ? selectedCatObj.color : '#3b82f6';

    onAddTask({
      title: title.trim(),
      description: description.trim(),
      deadline: deadlineISO,
      importance,
      category,
      estimatedDuration: Number(duration),
      colorHex
    });

    setTitle('');
    setDescription('');
    setDeadlineDate('');
    setDeadlineTime('23:59');
    setImportance('medium');
    setCategory('Studies');
    setDuration(60);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div 
        id="task-form-card"
        className="w-full max-w-lg bg-white border-4 border-black rounded-[32px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-[#1A1A1A]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b-4 border-black bg-[#FFE66D]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-black" />
            <h2 className="text-xl font-black text-black font-display tracking-tight">Create Rescue Plan</h2>
          </div>
          <button 
            id="close-form-btn"
            onClick={onClose} 
            className="text-black hover:bg-[#FF6B6B] hover:text-white p-1 rounded-xl border-2 border-black bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Task Title *
            </label>
            <input
              id="task-title-input"
              type="text"
              required
              placeholder="e.g., Chemistry Assignment, Q4 Report..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border-2 border-black rounded-xl text-black placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#FF6B6B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Description / Action Context
            </label>
            <textarea
              id="task-desc-input"
              rows={2}
              placeholder="Provide context. PriorAI uses this to build milestones."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border-2 border-black rounded-xl text-black placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#FF6B6B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all resize-none font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1 font-mono">
                Deadline Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-black" />
                <input
                  id="task-date-input"
                  type="date"
                  required
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border-2 border-black rounded-xl text-black focus:outline-hidden focus:ring-2 focus:ring-[#FF6B6B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1 font-mono">
                Deadline Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-black" />
                <input
                  id="task-time-input"
                  type="time"
                  required
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border-2 border-black rounded-xl text-black focus:outline-hidden focus:ring-2 focus:ring-[#FF6B6B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1 font-mono">
                Importance Level
              </label>
              <div className="relative">
                <AlertCircle className="absolute left-3 top-3.5 h-4 w-4 text-black" />
                <select
                  id="task-importance-select"
                  value={importance}
                  onChange={(e) => setImportance(e.target.value as ImportanceLevel)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-black rounded-xl text-black focus:outline-hidden focus:ring-2 focus:ring-[#FF6B6B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold appearance-none"
                >
                  <option value="high">🔥 High Impact</option>
                  <option value="medium">⚡ Medium</option>
                  <option value="low">🌱 Low Pressure</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1 font-mono">
                Estimated Work Effort
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-3.5 h-4 w-4 text-black" />
                <select
                  id="task-duration-select"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-black rounded-xl text-black focus:outline-hidden focus:ring-2 focus:ring-[#FF6B6B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold appearance-none"
                >
                  <option value={15}>15 mins (Sprint)</option>
                  <option value={30}>30 mins (Quick)</option>
                  <option value={60}>1 hour (Focus Block)</option>
                  <option value={120}>2 hours (Deep Work)</option>
                  <option value={240}>4 hours (Heavy task)</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 font-mono">
              Task Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
                  id={`cat-btn-${cat.name.toLowerCase()}`}
                  type="button"
                  onClick={() => setCategory(cat.name)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border-2 text-xs font-black transition-all ${
                    category === cat.name
                      ? 'bg-[#4ECDC4] border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-white border-black text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t-2 border-black/10">
            <button
              id="cancel-form-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 border-2 border-transparent hover:border-black rounded-xl text-slate-700 hover:text-black font-black transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-form-btn"
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B6B] hover:bg-[#e05353] text-white font-black rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            >
              <Plus className="h-4 w-4" />
              <span>Create Task</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
