/**
 * Core translation hook — wires speech recognition, AI translation,
 * TTS playback, message state, caching, and deduplication.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import useSpeechRecognition, { getBcp47 } from './useSpeechRecognition';

const LANGUAGES = [
  { code: 'en',  name: 'English',    flag: '🇺🇸', native: 'English' },
  { code: 'tl',  name: 'Filipino',   flag: '🇵🇭', native: 'Filipino' },
  { code: 'es',  name: 'Spanish',    flag: '🇪🇸', native: 'Español' },
  { code: 'fr',  name: 'French',     flag: '🇫🇷', native: 'Français' },
  { code: 'de',  name: 'German',     flag: '🇩🇪', native: 'Deutsch' },
  { code: 'it',  name: 'Italian',    flag: '🇮🇹', native: 'Italiano' },
  { code: 'pt',  name: 'Portuguese', flag: '🇧🇷', native: 'Português' },
  { code: 'zh',  name: 'Chinese',    flag: '🇨🇳', native: '中文' },
  { code: 'ja',  name: 'Japanese',   flag: '🇯🇵', native: '日本語' },
  { code: 'ko',  name: 'Korean',     flag: '🇰🇷', native: '한국어' },
  { code: 'ar',  name: 'Arabic',     flag: '🇸🇦', native: 'العربية' },
  { code: 'hi',  name: 'Hindi',      flag: '🇮🇳', native: 'हिन्दी' },
  { code: 'ru',  name: 'Russian',    flag: '🇷🇺', native: 'Русский' },
  { code: 'tr',  name: 'Turkish',    flag: '🇹🇷', native: 'Türkçe' },
  { code: 'th',  name: 'Thai',       flag: '🇹🇭', native: 'ไทย' },
  { code: 'vi',  name: 'Vietnamese', flag: '🇻🇳', native: 'Tiếng Việt' },
  { code: 'nl',  name: 'Dutch',      flag: '🇳🇱', native: 'Nederlands' },
  { code: 'pl',  name: 'Polish',     flag: '🇵🇱', native: 'Polski' },
  { code: 'sv',  name: 'Swedish',    flag: '🇸🇪', native: 'Svenska' },
];

// ── Cache helpers ─────────────────────────────────────────────────────────────
const CACHE_KEY  = 'vt_cache_v2';
const SAVED_KEY  = 'vt_saved_v1';
const HISTORY_KEY = 'vt_history_v1';

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
  catch { return {}; }
}

function writeCache(key, value) {
  const cache = readCache();
  cache[key] = { ...value, ts: Date.now() };
  const entries = Object.entries(cache);
  if (entries.length > 300) {
    const trimmed = Object.fromEntries(
      entries.sort((a, b) => a[1].ts - b[1].ts).slice(-300)
    );
    localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
  } else {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }
}

function cacheKey(text, src, tgt, tone) {
  return `${src}|${tgt}|${tone}|${text.toLowerCase().trim()}`;
}

// ── History helpers ──────────────────────────────────────────────────────────
export function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function saveToHistory(entry) {
  const history = getHistory();
  const newEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random()}`,
    created_date: new Date().toISOString(),
  };
  history.unshift(newEntry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

// ── Saved phrase helpers ──────────────────────────────────────────────────────
export function getSavedPhrases() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); }
  catch { return []; }
}
export function savePhraseLocally(phrase) {
  const saved = getSavedPhrases();
  // Prevent exact duplicate saves
  if (saved.some(s => s.text === phrase.text && s.lang === phrase.lang)) return;
  saved.unshift({ ...phrase, savedAt: Date.now() });
  localStorage.setItem(SAVED_KEY, JSON.stringify(saved.slice(0, 100)));
}
export function removeSavedPhrase(index) {
  const saved = getSavedPhrases();
  saved.splice(index, 1);
  localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
}

export { LANGUAGES };

// ── Main hook ─────────────────────────────────────────────────────────────────
export default function useTranslation() {
  // ── Core state ───────────────────────────────────────────────
  const [status, setStatus] = useState('idle'); // idle | listening | processing | translating | speaking
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const [tone, setTone] = useState('natural');
  const [speechSpeed, setSpeechSpeed] = useState(1);
  const [messages, setMessages] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [interimDisplay, setInterimDisplay] = useState('');

  // ── Refs ─────────────────────────────────────────────────────
  const synthRef              = useRef(window.speechSynthesis);
  const translationLockRef    = useRef(false);
  const pendingMsgIdRef       = useRef(null);
  const sourceLangRef         = useRef(sourceLang);
  const targetLangRef         = useRef(targetLang);
  const toneRef               = useRef(tone);
  const speechSpeedRef        = useRef(speechSpeed);
  const messagesRef           = useRef(messages);
  const setTranslatingFnRef   = useRef(null);

  // Keep refs in sync
  useEffect(() => { sourceLangRef.current = sourceLang; }, [sourceLang]);
  useEffect(() => { targetLangRef.current = targetLang; }, [targetLang]);
  useEffect(() => { toneRef.current = tone; }, [tone]);
  useEffect(() => { speechSpeedRef.current = speechSpeed; }, [speechSpeed]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // ── Network detection ────────────────────────────────────────
  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // ── Duplicate message guard ───────────────────────────────────
  const isDuplicateMessage = useCallback((text) => {
    const msgs = messagesRef.current;
    const recent = msgs.slice(-6);
    const norm = text.toLowerCase().trim();
    return recent.some(m => m.text?.toLowerCase().trim() === norm);
  }, []);

  // ── AI Translation via OpenAI ────────────────────────────────
  const callTranslate = useCallback(async (text, src, tgt, toneVal) => {
    const key = cacheKey(text, src, tgt, toneVal);
    const cached = readCache()[key];
    if (cached) return cached;

    if (!navigator.onLine) {
      return {
        translated_text: text,
        romanized_text: '',
        offline: true,
      };
    }

    const srcName = LANGUAGES.find(l => l.code === src)?.name || src;
    const tgtName = LANGUAGES.find(l => l.code === tgt)?.name || tgt;

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        console.error('OpenAI API key not configured');
        return {
          translated_text: text,
          romanized_text: '',
          error: 'API key not configured',
        };
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a professional translator. You must respond with valid JSON only, containing translated_text and romanized_text fields. No additional text or markdown.',
            },
            {
              role: 'user',
              content: `Translate from ${srcName} to ${tgtName}. Tone: ${toneVal}. Preserve punctuation and casing. Respond with JSON only: {"translated_text": "...", "romanized_text": "..." or ""}. Text to translate: "${text}"`,
            },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        console.error('OpenAI API error:', response.status);
        return {
          translated_text: text,
          romanized_text: '',
          error: 'Translation API error',
        };
      }

      const data = await response.json();
      let result = {};
      
      try {
        const content = data.choices[0]?.message?.content || '{}';
        result = JSON.parse(content);
      } catch (parseErr) {
        console.error('Failed to parse translation response:', parseErr);
        result = { translated_text: text, romanized_text: '' };
      }

      const entry = {
        translated_text: result.translated_text || text,
        romanized_text: result.romanized_text || '',
        source_text: text,
        source_lang: src,
        target_lang: tgt,
        tone: toneVal,
      };
      writeCache(key, entry);
      return entry;
    } catch (err) {
      console.error('Translation error:', err);
      return {
        translated_text: text,
        romanized_text: '',
        error: err.message,
      };
    }
  }, []);

  // ── Text-to-speech helper ────────────────────────────────────
  const speakText = useCallback((text, lang) => {
    setStatus('speaking');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getBcp47(lang);
    utterance.rate = speechSpeedRef.current;
    utterance.onend = () => {
      setStatus('idle');
    };
    synthRef.current.speak(utterance);
  }, []);

  // ── Core translation pipeline ─────────────────────────────────
  const runTranslation = useCallback(async (text, fromVoice = false) => {
    const cleaned = text.trim();
    if (!cleaned || cleaned.length < 2) return null;
    if (translationLockRef.current) return null;
    if (isDuplicateMessage(cleaned)) return null;

    translationLockRef.current = true;
    setTranslatingFnRef.current?.(true);

    const src  = sourceLangRef.current;
    const tgt  = targetLangRef.current;
    const tn   = toneRef.current;
    const now  = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const srcMsgId   = `src-${Date.now()}-${Math.random()}`;
    const tgtMsgId   = `tgt-${Date.now()}-${Math.random()}`;

    setMessages(prev => [...prev, {
      id: srcMsgId,
      type: 'source',
      text: cleaned,
      lang: src,
      time,
      fromVoice,
    }]);

    setStatus('translating');

    try {
      const translation = await callTranslate(cleaned, src, tgt, tn);

      setMessages(prev => [...prev, {
        id: tgtMsgId,
        type: 'target',
        text: translation.translated_text,
        romanized: translation.romanized_text,
        lang: tgt,
        time,
      }]);

      saveToHistory({
        source_text: cleaned,
        translated_text: translation.translated_text,
        romanized_text: translation.romanized_text,
        source_lang: src,
        target_lang: tgt,
        tone: tn,
      });

      setStatus('idle');
    } catch (err) {
      console.error('Translation failed:', err);
      setStatus('idle');
    } finally {
      translationLockRef.current = false;
      setTranslatingFnRef.current?.(false);
    }
  }, [callTranslate, isDuplicateMessage]);

  // ── Speech recognition integration ───────────────────────────
  const { initializeRecognition } = useSpeechRecognition({
    onInterimTranscript: setInterimDisplay,
    onFinalTranscript: (transcript) => {
      setInterimDisplay('');
      runTranslation(transcript, true);
    },
    onStatusChange: setStatus,
    setTranslatingFn: setTranslatingFnRef,
    sourceLang,
  });

  return {
    // State
    status,
    sourceLang,
    setSourceLang,
    targetLang,
    setTargetLang,
    tone,
    setTone,
    speechSpeed,
    setSpeechSpeed,
    messages,
    isOnline,
    interimDisplay,
    
    // Actions
    runTranslation,
    speakText,
    startListening: initializeRecognition,
    clearMessages: () => setMessages([]),
    
    // Helpers
    getSavedPhrases,
    savePhraseLocally,
    removeSavedPhrase,
  };
}
