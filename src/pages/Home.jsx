import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle } from 'lucide-react';
import useTranslation, { savePhraseLocally } from '@/lib/useTranslation';
import useDarkMode from '@/lib/useDarkMode';
import AppHeader from '@/components/translator/AppHeader';
import LanguageSelector from '@/components/translator/LanguageSelector';
import ControlBar from '@/components/translator/ControlBar';
import VoiceWaveform from '@/components/translator/VoiceWaveform';
import StateBadge from '@/components/translator/StateBadge'; // Fixed! Updated from StatusIndicator
import MessageBubble from '@/components/translator/MessageBubble'; // Fixed! Updated from ChatBubble
import FloatingMicButton from '@/components/translator/FloatingMicButton';
import TextInputBar from '@/components/translator/TextInputBar';
import SubtitleMode from '@/components/translator/SubtitleMode';
import EmergencyPhrases from '@/components/translator/EmergencyPhrases';
import PhraseList from '@/components/translator/PhraseList'; // Fixed! Updated from SavedPhrases
import HistoryPanel from '@/components/translator/HistoryPanel';
import { toast } from 'sonner';

export default function Home() {
  const {
    status,
    sourceLang,
    targetLang,
    tone,
    speechSpeed,
    messages,
    isOnline,
    interimDisplay,
    isListening,
    permissionState,
    isSpeechSupported,
    setSourceLang,
    setTargetLang,
    setTone,
    setSpeechSpeed,
    startListening,
    stopListening,
    speak,
    translateText,
    swapLanguages,
    clearMessages,
  } = useTranslation();

  const [isDark, setIsDark] = useDarkMode();
  const [savedOpen, setSavedOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [subtitleActive, setSubtitleActive] = useState(false);
  const chatEndRef = useRef(null);

  // Wire global error handler for speech errors
  useEffect(() => {
    window.__vtShowError = (msg) => toast.error(msg, { duration: 4000 });
    return () => { delete window.__vtShowError; };
  }, []);

  // Automatically scroll to the latest translation bubble
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimDisplay]);

  const handleSavePhrase = async (msg) => {
    try {
      await savePhraseLocally(msg);
      toast.success('Phrase book updated!');
    } catch (err) {
      toast.error('Could not save phrase');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      <AppHeader 
        isDark={isDark} 
        setIsDark={setIsDark} 
        onOpenSaved={() => setSavedOpen(true)} 
        onOpenHistory={() => setHistoryOpen(true)} 
      />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col gap-4 overflow-y-auto pb-32 scrollbar-hide">
        <div className="flex justify-between items-center glass p-3 rounded-2xl">
          <LanguageSelector 
            sourceLang={sourceLang} 
            targetLang={targetLang} 
            onSourceChange={setSourceLang} 
            onTargetChange={setTargetLang} 
            onSwap={swapLanguages} 
          />
          <StateBadge status={isOnline ? 'online' : 'offline'} />
        </div>

        <ControlBar 
          tone={tone} 
          setTone={setTone} 
          speechSpeed={speechSpeed} 
          setSpeechSpeed={setSpeechSpeed} 
          subtitleActive={subtitleActive}
          setSubtitleActive={setSubtitleActive}
        />

        {permissionState === 'denied' && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-3 text-sm">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>Microphone permission denied. Please allow mic access in your browser settings to translate voice.</p>
          </div>
        )}

        <div className="flex-1 min-h-[300px] glass-strong rounded-3xl p-4 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
            {messages.length === 0 && !interimDisplay && (
              <div className="h-full flex items-center justify-center text-center text-muted-foreground p-8">
                <p>Tap the microphone or type below to start translating sentences in real-time.</p>
              </div>
            )}

            {messages.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                onSave={() => handleSavePhrase(msg)}
                onSpeak={() => speak(msg.translated_text, targetLang)} 
              />
            ))}

            {interimDisplay && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-muted/40 text-muted-foreground p-3 rounded-2xl max-w-[80%] italic animate-pulse">
                  {interimDisplay}...
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          {messages.length > 0 && (
            <button 
              onClick={clearMessages} 
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
              title="Clear transcription history"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {subtitleActive && <SubtitleMode text={interimDisplay || (messages[messages.length - 1]?.translated_text)} />}
        <EmergencyPhrases onSelect={(text) => translateText(text)} />
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent z-20">
        <div className="max-w-4xl w-full mx-auto flex items-center gap-3">
          <TextInputBar onSend={(text) => translateText(text)} disabled={isListening} />
          <FloatingMicButton 
            isListening={isListening} 
            onStart={startListening} 
            onStop={stopListening} 
          />
        </div>
      </div>

      {isListening && <VoiceWaveform />}

      <AnimatePresence>
        {savedOpen && <PhraseList onClose={() => setSavedOpen(false)} />}
        {historyOpen && <HistoryPanel onClose={() => setHistoryOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
