import { useCallback, useEffect, useRef, useState } from "react";

type SR = typeof window extends { SpeechRecognition: infer T } ? T : any;

export function useVoiceInput({ lang = "ur-PK", onFinal }: { lang?: string; onFinal?: (text: string) => void } = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const start = useCallback(() => {
    setError(null);
    setTranscript("");
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Voice input not supported in this browser"); return; }
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let finalText = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setTranscript(finalText + interim);
    };
    rec.onerror = (e: any) => { setError(e.error || "Voice error"); setListening(false); };
    rec.onend = () => {
      setListening(false);
      if (finalText && onFinal) onFinal(finalText.trim());
    };
    rec.start();
    recRef.current = rec;
    setListening(true);
  }, [lang, onFinal]);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* noop */ }
    setListening(false);
  }, []);

  return { supported, listening, transcript, error, start, stop, setTranscript };
}
