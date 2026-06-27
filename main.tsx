import React, { useState } from 'react';
import { Sparkles, Calendar, Plus, CheckCircle, Circle, Flame, Award, HeartHandshake } from 'lucide-react';
import { Habit } from '../types';

interface HabitTrackerProps {
  habits: Habit[];
  onAddHabit: (habit: Omit<Habit, 'id' | 'streak' | 'maxStreak' | 'lastCompletedDate' | 'history' | 'createdAt'>) => void;
  onToggleHabit: (habitId: string, dateStr: string) => void;
}

const CATEGORIES = ['Studies 📚', 'Work 💼', 'Personal 🌱', 'Finance 💰', 'Health 🏃', 'Admin ⚙️'];

export default function HabitTracker({ habits, onAddHabit, onToggleHabit }: HabitTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [category, setCategory] = useState('Studies 📚');

  // Helper: Get the last 7 days dates as YYYY-MM-DD
  const getLast7Days = () => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      list.push({ iso, dayName, dayNum });
    }
    return list;
  };

  const daysList = getLast7Days();
  const todayStr = new Date().toISOString().split('T')[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddHabit({
      name: name.trim(),
      description: description.trim(),
      frequency,
      category
    });

    setName('');
    setDescription('');
    setFrequency('daily');
    setCategory('Studies 📚');
    setShowAddForm(false);
  };

  // Helper: check completion of habit for date
  const isCompletedOn = (habit: Habit, dateStr: string) => {
    return !!habit.history[dateStr];
  };

  return (
    <div className="space-y-6" id="habit-tracker-view">
      {/* Habit Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#1A1A1A] font-display tracking-tight">Daily Consistency Pillars</h2>
          <p className="text-xs text-slate-600 font-medium">Locking in small habits is the ultimate protection from last-minute crunches.</p>
        </div>
        
        <button
          id="toggle-add-habit-btn"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#FFE66D] hover:bg-[#e5ce50] text-black border-2 border-black rounded-xl font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          <span>{showAddForm ? 'Close Drawer' : 'Create Pillar'}</span>
        </button>
      </div>

      {/* Add Habit Drawer */}
      {showAddForm && (
        <form 
          id="add-habit-form"
          onSubmit={handleSubmit} 
          className="bg-white border-4 border-black p-5 rounded-[24px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4 animate-in slide-in-from-top duration-200 text-[#1A1A1A]"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider font-mono">Habit Name *</label>
              <input
                id="habit-name-input"
                type="text"
                required
                placeholder="e.g., Code for 15 mins, Read 5 pages..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-xs font-bold text-black focus:outline-hidden focus:ring-2 focus:ring-[#FF6B6B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider font-mono">Short Mission Statement</label>
              <input
                id="habit-desc-input"
                type="text"
                placeholder="e.g., Helps build focus and competence."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-xs font-bold text-black focus:outline-hidden focus:ring-2 focus:ring-[#FF6B6B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider font-mono">Category</label>
              <select
                id="habit-cat-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-xs font-bold text-black focus:outline-hidden focus:ring-2 focus:ring-[#FF6B6B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider font-mono">Frequency</label>
              <select
                id="habit-freq-select"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-xs font-bold text-black focus:outline-hidden focus:ring-2 focus:ring-[#FF6B6B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <option value="daily">📅 Every Single Day</option>
                <option value="weekly">🗓️ Weekly Anchor</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              id="submit-habit-btn"
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#FF6B6B] hover:bg-[#e05353] text-white font-black text-xs rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Establish Habit</span>
            </button>
          </div>
        </form>
      )}

      {/* Habits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="habits-list-grid">
        {habits.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white border-4 border-dashed border-slate-300 rounded-[24px]">
            <HeartHandshake className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 font-bold">No consistency pillars built yet.</p>
            <p className="text-xs text-slate-500 mt-1">Start small (e.g., "Review schedule every morning") to gain leverage!</p>
          </div>
        ) : (
          habits.map((habit) => {
            const hasDoneToday = isCompletedOn(habit, todayStr);

            return (
              <div
                key={habit.id}
                id={`habit-card-${habit.id}`}
                className="bg-white border-2 border-black rounded-2xl p-5 space-y-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] transition-all text-[#1A1A1A]"
              >
                {/* Habit Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-lg">
                        {habit.category}
                      </span>
                      <span className="text-[10px] text-slate-500 capitalize font-bold font-mono">{habit.frequency}</span>
                    </div>
                    <h3 className="font-display font-black text-black text-base">{habit.name}</h3>
                    <p className="text-xs text-slate-600 font-medium">{habit.description || "Building continuous competence."}</p>
                  </div>

                  {/* Streaks metrics */}
                  <div className="flex items-center gap-1.5 bg-white border-2 border-black px-2.5 py-1 rounded-xl text-[#FF6B6B] font-black shrink-0 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                    <Flame className="h-4.5 w-4.5 fill-current text-[#FF6B6B] animate-pulse" />
                    <div className="text-right">
                      <div className="text-xs leading-none">{habit.streak}d</div>
                      <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">streak</div>
                    </div>
                  </div>
                </div>

                {/* 7-Day Matrix */}
                <div className="pt-3 border-t-2 border-black/10">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider font-mono">Weekly Consistency Matrix</span>
                    <div className="flex items-center gap-1 text-[10px] text-[#4ECDC4] font-black">
                      <Award className="h-3.5 w-3.5" />
                      <span>Best Streak: {habit.maxStreak}d</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {daysList.map((day) => {
                      const isCompleted = isCompletedOn(habit, day.iso);
                      const isToday = day.iso === todayStr;

                      return (
                        <div
                          key={day.iso}
                          id={`habit-day-${habit.id}-${day.iso}`}
                          onClick={() => onToggleHabit(habit.id, day.iso)}
                          className={`flex flex-col items-center p-1.5 rounded-xl border-2 cursor-pointer transition select-none ${
                            isCompleted
                              ? 'bg-[#4ECDC4]/20 border-black text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] font-black'
                              : isToday
                                ? 'bg-[#FFE66D]/10 border-[#FFE66D] text-black font-bold'
                                : 'bg-white border-slate-200 text-slate-400 hover:border-black hover:text-black font-semibold'
                          }`}
                        >
                          <span className="text-[9px] uppercase font-black tracking-wider leading-none font-mono">{day.dayName}</span>
                          <span className="text-xs font-bold mt-1 leading-none">{day.dayNum}</span>
                          
                          <div className="mt-1.5">
                            {isCompleted ? (
                              <CheckCircle className="h-4 w-4 text-emerald-600 fill-emerald-500/10" />
                            ) : (
                              <Circle className="h-4 w-4 text-slate-300 hover:text-slate-600" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
