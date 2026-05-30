import { Moon, Sun, Bookmark, Clock, Wifi, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AppHeader({ isDark, onToggleDark, isOnline, onOpenSaved, onOpenHistory }) {
  return (
    <header className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
          <span className="text-white font-bold text-sm">V</span>
        </div>
        <div>
          <h1 className="font-heading font-bold text-base leading-none">VoiceTranslate</h1>
          <p className="text-xs text-muted-foreground">AI-Powered</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {/* Online indicator */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-orange-500'}`}>
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
        </div>
        <button onClick={onOpenHistory} className="p-2 hover:bg-secondary/80 rounded-lg transition-colors">
          <Clock className="w-5 h-5 text-muted-foreground" />
        </button>
        <button onClick={onOpenSaved} className="p-2 hover:bg-secondary/80 rounded-lg transition-colors">
          <Bookmark className="w-5 h-5 text-muted-foreground" />
        </button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onToggleDark}
          className="p-2 hover:bg-secondary/80 rounded-lg transition-colors"
        >
          {isDark ? <Sun className="w-5 h-5 text-muted-foreground" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
        </motion.button>
      </div>
    </header>
  );
}