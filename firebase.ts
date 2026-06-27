import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Play, Pause, RotateCcw, CheckCircle, Circle, 
  Sparkles, Volume2, VolumeX, ShieldAlert, Heart, Zap 
} from 'lucide-react';
import { Task, Milestone } from '../types';

interface FocusZoneProps {
  task: Task;
  onClose: () => void;
  onToggleMilestone: (taskId: string, milestoneId: string) => void;
  onCompleteTask: (taskId: string) => void;
}

const AI_GUIDELINES = [
  "Breathe. Procrastination is just fear of starting. You are doing it right now.",
  "Turn off all social tabs. Close your eyes for 3 seconds, then focus only on Milestone 1.",
  "Momentum is your shield. Writing even one bad sentence is a win. Clean it up later.",
  "You don't need a perfect plan, you just need to start this pomodoro. Trust the clock.",
  "You are safe here in the Focus Zone. No distractions can reach you. Keep pushing!",
  "Halfway done! Your brain is adapting to focus. Keep that beautiful tempo.",
  "If your mind wanders, gently guide it back. No self-criticism. Just start again."
];

export default function FocusZone({
  task,
  onClose,
  onToggleMilestone,
  onCompleteTask
}: FocusZoneProps) {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isRunning, setIsRunning] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentAdviceIndex, setCurrentAdviceIndex] = useState(0);
  const [sessionNotes, setSessionNotes] = useState('');
  const [showLogSuccess, setShowLogSuccess] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Rotate AI Advice every 45 seconds
  useEffect(() => {
    const adviceInterval = setInterval(() => {
      setCurrentAdviceIndex((prev) => (prev + 1) % AI_GUIDELINES.length);
    }, 45000);
    return () => clearInterval(adviceInterval);
  }, []);

  // Timer Countdown Logic
  useEffect(() => {
    if (isRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            playBeepSound();
            setShowLogSuccess(true);
            return 0;
          }
          // Play a tiny tick sound every second if unmuted
          if (prev % 5 === 0) {
            playTickSound();
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRunning]);

  // Web Audio Synth for Focus Tick Sounds (fully compliant, no external asset dependencies)
  const playTickSound = () => {
    if (isMuted) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.log('Synth sound block:', e);
    }
  };

  const playBeepSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.log('Synth sound block:', e);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(25 * 60);
  };

  // Calculate circular timer stroke dashoffset
  const totalDuration = 25 * 60;
  const progressPercent = (timeLeft / totalDuration) * 100;
  const strokeDashoffset = 2 * Math.PI * 90 * (1 - progressPercent / 100);

  return (
    <div 
      id="focus-zone-overlay"
      className="fixed inset-0 z-50 bg-[#F4F1DE] backdrop-blur-md flex flex-col items-center justify-between p-6 overflow-y-auto text-[#1A1A1A]"
    >
      {/* Header */}
      <div className="w-full max-w-5xl flex items-center justify-between border-b-4 border-black pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 bg-[#FF6B6B] rounded-full animate-ping" />
          <div className="flex items-center gap-1.5 bg-[#FF6B6B] border-2 border-black px-3.5 py-1.5 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <ShieldAlert className="h-4 w-4 text-white shrink-0" />
            <span className="text-xs font-black text-white uppercase tracking-wider font-mono">Rescue Mode Active</span>
          </div>
        </div>

        <button 
          id="exit-focus-btn"
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs font-black text-black bg-white border-2 border-black px-4 py-2 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0.5 transition-transform"
        >
          <X className="h-4 w-4" />
          <span>Exit Focus Zone</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-10 my-auto py-6 items-center">
        {/* Left Side: Timer & Controls */}
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="relative flex items-center justify-center h-56 w-56 bg-white border-4 border-black rounded-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            {/* SVG Circular Progress */}
            <svg className="absolute inset-0 h-full w-full rotate-270">
              <circle
                cx="112"
                cy="112"
                r="90"
                className="stroke-slate-100 stroke-[6px] fill-transparent"
              />
              <circle
                cx="112"
                cy="112"
                r="90"
                style={{ strokeDashoffset }}
                strokeDasharray={2 * Math.PI * 90}
                className="stroke-[#FF6B6B] stroke-[8px] fill-transparent stroke-linecap-round transition-all duration-300"
              />
            </svg>

            {/* Time label */}
            <div className="z-10">
              <div className="text-4xl font-mono font-black text-black tracking-widest">
                {formatTime(timeLeft)}
              </div>
              <div className="text-[10px] uppercase font-black text-slate-500 tracking-wider mt-1 font-mono">
                {isRunning ? 'FOCUS FLOWING' : 'READY TO RESCUE'}
              </div>
            </div>
          </div>

          {/* Core Controls */}
          <div className="flex items-center gap-4">
            <button
              id="toggle-mute-focus-btn"
              onClick={() => setIsMuted(!isMuted)}
              className="p-3 bg-white border-2 border-black rounded-full text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0.5"
              title={isMuted ? 'Unmute focus tick' : 'Mute focus tick'}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>

            <button
              id="play-pause-focus-btn"
              onClick={() => setIsRunning(!isRunning)}
              className="p-5 bg-[#FF6B6B] hover:bg-[#e05353] text-white rounded-full border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0.5"
            >
              {isRunning ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}
            </button>

            <button
              id="reset-focus-btn"
              onClick={handleReset}
              className="p-3 bg-white border-2 border-black rounded-full text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0.5"
              title="Reset timer"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>

          {/* Rolling Supportive AI Guidance */}
          <div className="p-4 bg-[#FFE66D]/15 border-2 border-black rounded-2xl max-w-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-center gap-1 text-xs font-black text-[#4ECDC4] mb-1.5 uppercase tracking-wider font-mono">
              <Sparkles className="h-3.5 w-3.5 text-[#4ECDC4] fill-current" />
              <span>PriorAI Coach Advice</span>
            </div>
            <p className="text-xs text-slate-800 font-bold leading-relaxed italic">
              "{AI_GUIDELINES[currentAdviceIndex]}"
            </p>
          </div>
        </div>

        {/* Right Side: Task context and Milestones checklists */}
        <div className="bg-white border-4 border-black rounded-[24px] p-6 space-y-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-white bg-[#FF6B6B] border border-black px-2.5 py-0.5 rounded-lg shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] font-mono">
              Focus Objective
            </span>
            <h2 className="font-display font-black text-xl text-black tracking-tight">{task.title}</h2>
            <p className="text-xs text-slate-600 font-medium leading-normal">{task.description || 'Defeat procrastination now.'}</p>
          </div>

          {/* Milestones Panel */}
          <div className="space-y-3 pt-4 border-t-2 border-black/10">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider font-mono">
              Action Plan Milestones
            </h3>

            {task.milestones.length === 0 ? (
              <p className="text-xs text-slate-500 italic font-medium">No milestones built. Expand this task in the main list to generate AI milestones.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {task.milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    id={`focus-milestone-${milestone.id}`}
                    onClick={() => onToggleMilestone(task.id, milestone.id)}
                    className={`flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all ${
                      milestone.isCompleted
                        ? 'border-black bg-slate-100 text-slate-400 opacity-70 shadow-none'
                        : 'border-black bg-white hover:-translate-y-0.5 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <button className="text-slate-500">
                        {milestone.isCompleted ? (
                          <CheckCircle className="h-4.5 w-4.5 text-emerald-500 fill-emerald-500/10" />
                        ) : (
                          <Circle className="h-4.5 w-4.5 text-slate-400" />
                        )}
                      </button>
                      <span className={`text-xs font-bold ${milestone.isCompleted ? 'line-through' : ''}`}>
                        {milestone.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              id="focus-complete-task-btn"
              onClick={() => {
                onCompleteTask(task.id);
                setShowLogSuccess(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#4ECDC4] hover:bg-[#3dbcb3] text-black font-black text-xs rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
            >
              <CheckCircle className="h-4 w-4" />
              <span>MARK TASK AS COMPLETED</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal at end of session */}
      {showLogSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white border-4 border-black p-6 rounded-[32px] max-w-md w-full space-y-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-[#1A1A1A]">
            <div className="text-center space-y-2">
              <div className="mx-auto h-12 w-12 bg-[#FFE66D] border-2 border-black rounded-full flex items-center justify-center text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Zap className="h-6 w-6 fill-current" />
              </div>
              <h3 className="text-lg font-black text-black">Incredible Focus, Champion!</h3>
              <p className="text-xs text-slate-600 font-bold">You took meaningful action and broke procrastination. Log your progress below.</p>
            </div>

            <textarea
              id="focus-success-notes"
              rows={3}
              placeholder="What did you achieve? Writing it down seals the momentum boost..."
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black placeholder-slate-400 focus:outline-hidden text-xs resize-none font-medium shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            />

            <div className="flex gap-2">
              <button
                id="close-success-log-btn"
                onClick={() => {
                  setShowLogSuccess(false);
                  onClose();
                }}
                className="w-full py-2.5 bg-[#FF6B6B] hover:bg-[#e05353] text-white font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
              >
                Log Session & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="w-full max-w-5xl text-center text-[10px] font-mono text-slate-600 border-t-2 border-black/10 pt-4 shrink-0">
        PriorAI Emergency Rescue Unit | Escape procrastination with proactive, micro-focused action.
      </div>
    </div>
  );
}
