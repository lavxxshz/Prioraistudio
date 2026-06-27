import React, { useState } from 'react';
import { Calendar, Clock, Sparkles, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { Task, TimeBlock } from '../types';

interface SchedulePlannerProps {
  tasks: Task[];
  timeBlocks: TimeBlock[];
  onAddTimeBlock: (block: Omit<TimeBlock, 'id'>) => void;
  onDeleteTimeBlock: (blockId: string) => void;
  onAutoScheduleAI: () => void;
  isScheduling: boolean;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8:00 AM to 10:00 PM

export default function SchedulePlanner({
  tasks,
  timeBlocks,
  onAddTimeBlock,
  onDeleteTimeBlock,
  onAutoScheduleAI,
  isScheduling
}: SchedulePlannerProps) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [startHour, setStartHour] = useState<string>('09:00');
  const [endHour, setEndHour] = useState<string>('10:00');

  // Filter time blocks for selected date
  const filteredBlocks = timeBlocks.filter(b => b.date === selectedDate);

  // Get active pending tasks that aren't completed
  const pendingTasks = tasks.filter(t => t.status !== 'completed');

  const handleManualSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId) return;

    const task = tasks.find(t => t.id === selectedTaskId);
    if (!task) return;

    // Check overlaps
    const overlaps = filteredBlocks.some(b => {
      return (startHour >= b.startTime && startHour < b.endTime) ||
             (endHour > b.startTime && endHour <= b.endTime) ||
             (startHour <= b.startTime && endHour >= b.endTime);
    });

    if (overlaps) {
      alert("⚠️ Overlap detected! There is already a scheduled task in this time block.");
      return;
    }

    onAddTimeBlock({
      taskId: task.id,
      taskTitle: task.title,
      date: selectedDate,
      startTime: startHour,
      endTime: endHour,
      category: task.category
    });

    setSelectedTaskId('');
  };

  // Helper: Find a block at a given hour
  const getBlockForHour = (hour: number) => {
    const hourStr = hour.toString().padStart(2, '0') + ':00';
    return filteredBlocks.find(b => {
      const [startH] = b.startTime.split(':');
      const [endH] = b.endTime.split(':');
      const startNum = parseInt(startH, 10);
      const endNum = parseInt(endH, 10);
      return hour >= startNum && hour < endNum;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="schedule-planner-view">
      {/* Time block Form & Info */}
      <div className="space-y-6 lg:col-span-1">
        <div className="bg-white border-4 border-black p-5 rounded-[24px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4 text-black">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-black" />
            <h3 className="font-display font-black text-lg text-black">Target Date</h3>
          </div>
          
          <input
            id="planner-date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border-2 border-black rounded-xl text-black font-bold focus:outline-hidden focus:ring-2 focus:ring-[#FF6B6B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          />

          <div className="pt-3 border-t-2 border-black/10 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-slate-600">Scheduled Blocks</span>
              <span className="text-xs font-black text-black bg-[#FFE66D] border-2 border-black px-3 py-1 rounded-full shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] font-mono">
                {filteredBlocks.length} slots
              </span>
            </div>
            
            {/* AI auto time-blocking */}
            <button
              id="ai-auto-schedule-btn"
              onClick={onAutoScheduleAI}
              disabled={isScheduling || pendingTasks.length === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#4ECDC4] hover:bg-[#3dbcb3] disabled:bg-slate-200 disabled:text-slate-500 text-black font-black rounded-xl text-xs border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            >
              <Sparkles className={`h-4 w-4 ${isScheduling ? 'animate-spin' : ''}`} />
              <span>{isScheduling ? 'Drafting TimeBlocks...' : 'AI Smart Time Block'}</span>
            </button>
            <p className="text-[10px] text-slate-600 font-medium leading-normal text-center font-mono">
              Intelligently places pending tasks into optimal, distraction-free morning & afternoon hours based on deadline urgency.
            </p>
          </div>
        </div>

        {/* Manual Scheduling form */}
        <div className="bg-white border-4 border-black p-5 rounded-[24px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-black">
          <h3 className="font-display font-black text-black mb-4 flex items-center gap-1.5 text-base">
            <Clock className="h-4 w-4 text-black" />
            <span>Manual Slot Booking</span>
          </h3>

          {pendingTasks.length === 0 ? (
            <p className="text-xs text-slate-500 font-bold">No active tasks available to schedule.</p>
          ) : (
            <form onSubmit={handleManualSchedule} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1 font-mono">Select Task</label>
                <select
                  id="schedule-task-select"
                  required
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-xs font-bold text-black focus:outline-hidden focus:ring-2 focus:ring-[#FF6B6B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  <option value="">-- Choose Task --</option>
                  {pendingTasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase mb-1 font-mono">Start Time</label>
                  <select
                    id="schedule-start-select"
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-xs font-bold text-black focus:outline-hidden"
                  >
                    {HOURS.map(h => {
                      const str = h.toString().padStart(2, '0') + ':00';
                      return <option key={str} value={str}>{str}</option>;
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase mb-1 font-mono">End Time</label>
                  <select
                    id="schedule-end-select"
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-xs font-bold text-black focus:outline-hidden"
                  >
                    {HOURS.map(h => {
                      const str = (h + 1).toString().padStart(2, '0') + ':00';
                      return <option key={str} value={str}>{str}</option>;
                    })}
                  </select>
                </div>
              </div>

              <button
                id="manual-schedule-submit"
                type="submit"
                disabled={!selectedTaskId}
                className="w-full py-2.5 bg-[#FFE66D] hover:bg-[#e5ce50] disabled:bg-slate-100 disabled:text-slate-400 text-black font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
              >
                Book Time Slot
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Hourly Schedule visualizer */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white border-4 border-black rounded-[24px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden p-6 text-black">
          <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-black/10">
            <h3 className="font-display font-black text-lg text-black">Daily Hourly Visualizer</h3>
            <span className="text-xs text-slate-600 font-bold font-mono bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-300">24h format</span>
          </div>

          <div className="space-y-2 divide-y-2 divide-slate-100">
            {HOURS.map((hour) => {
              const hourStr = hour.toString().padStart(2, '0') + ':00';
              const block = getBlockForHour(hour);

              return (
                <div 
                  key={hour} 
                  id={`hour-row-${hour}`}
                  className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                >
                  {/* Hour label */}
                  <div className="w-14 text-right text-xs font-black text-slate-500 font-mono shrink-0">
                    {hourStr}
                  </div>

                  {/* Schedule slot container */}
                  <div className="flex-1">
                    {block ? (
                      <div 
                        id={`schedule-block-${block.id}`}
                        className="flex items-center justify-between px-4 py-2.5 bg-[#F7F7F7] border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group hover:-translate-y-0.5 transition-all"
                      >
                        {/* Accent category bar */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-2 border-r-2 border-black"
                          style={{
                            backgroundColor: 
                              block.category === 'Studies' ? '#3b82f6' :
                              block.category === 'Work' ? '#10b981' :
                              block.category === 'Personal' ? '#8b5cf6' :
                              block.category === 'Finance' ? '#f59e0b' :
                              block.category === 'Health' ? '#ec4899' : '#64748b'
                          }}
                        />

                        <div className="pl-2.5">
                          <p className="text-xs font-black text-black">{block.taskTitle}</p>
                          <p className="text-[10px] text-slate-600 font-bold font-mono">
                            {block.startTime} - {block.endTime} | {block.category}
                          </p>
                        </div>

                        <button
                          id={`delete-block-btn-${block.id}`}
                          onClick={() => onDeleteTimeBlock(block.id)}
                          className="p-1.5 text-slate-400 hover:text-[#FF6B6B] hover:bg-slate-100 border border-transparent hover:border-black rounded-lg transition opacity-0 group-hover:opacity-100 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-11 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-[10px] text-slate-400 font-black font-mono tracking-widest select-none hover:bg-slate-50 hover:border-black transition-colors">
                        SLOT OPEN
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
