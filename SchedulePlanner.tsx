@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Space Grotesk", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --color-brand-50: #FFF9F2;
  --color-brand-100: #FFE66D;
  --color-brand-500: #FF6B6B;
  --color-brand-600: #e05353;
  
  --color-rescue-500: #FF6B6B;
  --color-rescue-600: #FF6B6B;
}

body {
  font-family: var(--font-sans);
  background-color: #FAF8F5;
  color: #1A1A1A;
  overflow-x: hidden;
}

/* Custom Scrollbar for modern aesthetic */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: #F0F2F5;
  border-left: 2px solid #1A1A1A;
}

::-webkit-scrollbar-thumb {
  background: #1A1A1A;
  border: 2px solid #F0F2F5;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #FF6B6B;
}

/* Pulsing Rescue Button Effect */
@keyframes rescue-pulse {
  0% {
    box-shadow: 0px 0px 0px 0px rgba(255, 107, 107, 0.7);
  }
  70% {
    box-shadow: 0px 0px 0px 12px rgba(255, 107, 107, 0);
  }
  100% {
    box-shadow: 0px 0px 0px 0px rgba(255, 107, 107, 0);
  }
}

.rescue-pulse-active {
  animation: rescue-pulse 2s infinite;
}

/* Neo-brutalist helper utilities */
.brutalist-card {
  background-color: #FFFFFF;
  border: 4px solid #1A1A1A;
  border-radius: 24px;
  box-shadow: 6px 6px 0px 0px #1A1A1A;
  transition: all 0.15s ease-out;
}

.brutalist-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 8px 8px 0px 0px #1A1A1A;
}

.brutalist-btn-primary {
  background-color: #FF6B6B;
  color: #FFFFFF;
  border: 3px solid #1A1A1A;
  border-radius: 12px;
  font-weight: 800;
  box-shadow: 3px 3px 0px 0px #1A1A1A;
  transition: all 0.1s ease-out;
}

.brutalist-btn-primary:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0px 0px #1A1A1A;
}

.brutalist-btn-primary:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0px 0px #1A1A1A;
}

.brutalist-btn-secondary {
  background-color: #FFE66D;
  color: #1A1A1A;
  border: 3px solid #1A1A1A;
  border-radius: 12px;
  font-weight: 800;
  box-shadow: 3px 3px 0px 0px #1A1A1A;
  transition: all 0.1s ease-out;
}

.brutalist-btn-secondary:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0px 0px #1A1A1A;
}

.brutalist-btn-secondary:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0px 0px #1A1A1A;
}

.brutalist-btn-mint {
  background-color: #4ECDC4;
  color: #1A1A1A;
  border: 3px solid #1A1A1A;
  border-radius: 12px;
  font-weight: 800;
  box-shadow: 3px 3px 0px 0px #1A1A1A;
  transition: all 0.1s ease-out;
}

.brutalist-btn-mint:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0px 0px #1A1A1A;
}

.brutalist-btn-mint:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0px 0px #1A1A1A;
}

.brutalist-btn-mono {
  background-color: #FFFFFF;
  color: #1A1A1A;
  border: 3px solid #1A1A1A;
  border-radius: 12px;
  font-weight: 800;
  box-shadow: 3px 3px 0px 0px #1A1A1A;
  transition: all 0.1s ease-out;
}

.brutalist-btn-mono:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0px 0px #1A1A1A;
}

.brutalist-btn-mono:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0px 0px #1A1A1A;
}

.brutalist-input {
  background-color: #FFFFFF;
  color: #1A1A1A;
  border: 3px solid #1A1A1A;
  border-radius: 12px;
  box-shadow: 2px 2px 0px 0px #1A1A1A;
}

.brutalist-input:focus {
  outline: none;
  box-shadow: 4px 4px 0px 0px #1A1A1A;
  border-color: #FF6B6B;
}

