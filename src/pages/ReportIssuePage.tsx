import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Mic, MicOff, Camera, ArrowLeft } from "lucide-react";

export default function ReportIssuePage() {
  const { handleTriggerScan, handleCaptureComplete, playerPos, triggerToast } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [voiceText, setVoiceText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en-IN");
  const recognitionRef = useRef<any>(null);

  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      triggerToast("Speech recognition not supported in this browser.", "info");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = selectedLanguage;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setVoiceText(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return (
    <div className="bg-[#F5F0E8] min-h-[100dvh] text-[#191c22] font-sans pt-16 pb-24 px-4 max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[#006a65] font-bold text-xs mb-4 cursor-pointer"><ArrowLeft className="w-4 h-4" /> {t.common.back}</button>
      <h1 className="font-display text-xl font-black uppercase text-[#006a65] mb-1">{t.report.title}</h1>
      <p className="text-xs text-zinc-400 mb-6">{t.report.subtitle}</p>

      <div className="bg-white p-4 rounded-2xl border border-zinc-200 mb-4">
        <h3 className="text-xs font-bold uppercase text-zinc-400 mb-3">{t.report.voiceReporting}</h3>
        <div className="flex gap-2 mb-3">
          {["en-US", "hi-IN", "te-IN"].map(lang => (
            <button key={lang} onClick={() => setSelectedLanguage(lang)} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold ${selectedLanguage === lang ? "bg-[#006a65] text-white" : "bg-zinc-100 text-zinc-500"}`}>
              {lang === "en-US" ? "English" : lang === "hi-IN" ? "हिंदी" : "తెలుగు"}
            </button>
          ))}
        </div>
        <button onClick={isListening ? stopVoice : startVoice} className={`w-full py-4 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all ${isListening ? "bg-red-500 text-white animate-pulse" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}>
          {isListening ? <><MicOff className="w-4 h-4" /> {t.report.stopRecording}</> : <><Mic className="w-4 h-4" /> {t.report.startVoice}</>}
        </button>
        {voiceText && (
          <div className="mt-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-700">{voiceText}</div>
        )}
        {voiceText && (
          <button onClick={() => { navigate("/"); triggerToast("Voice report submitted for AI analysis.", "success"); }} className="mt-3 w-full py-3 rounded-xl bg-[#006a65] text-white font-bold text-xs uppercase hover:bg-teal-700 transition-colors">
            Submit Voice Report
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl border border-zinc-200 mb-4">
        <h3 className="text-xs font-bold uppercase text-zinc-400 mb-3">{t.report.photoReport}</h3>
        <button onClick={() => { handleTriggerScan(); navigate("/scan-result"); }} className="w-full py-4 rounded-xl bg-[#f0c040] text-[#251a00] font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer hover:bg-[#e6b830]">
          <Camera className="w-4 h-4" /> {t.report.openCamera}
        </button>
      </div>

      <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-[10px] text-zinc-400 text-center">
        📍 {t.common.currentLocation} {playerPos.lat.toFixed(4)}, {playerPos.lng.toFixed(4)}
      </div>
    </div>
  );
}
