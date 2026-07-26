import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  Rocket, Trophy, ShieldCheck, Camera, Brain, Gift,
  Send, Award, Cpu, Shield, ArrowRight, Check, MapPin, Zap, Users, ChevronRight,
  Navigation, MessageCircle, Star, Globe
} from "lucide-react";
import { UserProfile } from "../../lib/constants";
import { useLanguage } from "../../context/LanguageContext";
import { LANGUAGES } from "../../context/LanguageContext";
import mapBg from "../../assets/map_bg.jpg";

const CARD_HEADER_H = 56;

function StickyCardStack({ children, headerHeight = CARD_HEADER_H }: { children: React.ReactNode; headerHeight?: number }) {
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const setCardRef = useCallback((el: HTMLDivElement | null, i: number) => {
    cardsRef.current[i] = el;
  }, []);

  useEffect(() => {
    const cards = cardsRef.current.filter(Boolean);
    if (cards.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = cards.indexOf(e.target as HTMLDivElement);
            if (idx !== -1) setActiveIndex(idx);
          }
        }
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0.05 }
    );
    cards.forEach((c) => obs.observe(c));
    return () => obs.disconnect();
  }, [children]);

  return (
    <div className="block md:contents">
      {React.Children.map(children, (child, i) => {
        if (!React.isValidElement(child)) return child;
        const topOffset = i * headerHeight;
        const isActive = i === activeIndex;
        return (
          <div
            ref={(el) => setCardRef(el, i)}
            style={{ top: `${topOffset}px` }}
            className={
              "sticky z-0 " +
              "max-md:transition-[transform,box-shadow] max-md:duration-500 max-md:ease-[cubic-bezier(0.4,0,0.2,1)] max-md:will-change-transform " +
              (isActive ? "max-md:z-30 max-md:scale-100 max-md:shadow-xl" : "max-md:z-10 max-md:scale-[0.97] max-md:shadow-lg")
            }
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}

interface LandingViewProps {
  user: UserProfile | null;
  isAuthenticated: boolean;
  onLogin: () => void;
  onSignup: () => void;
  onStartMission: () => void;
  onViewProfile: () => void;
  onViewLeaderboard: () => void;
  onViewMaps: () => void;
}

export default function LandingView({
  user,
  isAuthenticated,
  onLogin,
  onSignup,
  onStartMission,
  onViewProfile,
  onViewLeaderboard,
  onViewMaps
}: LandingViewProps) {
  const { language, setLanguage, t } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-[#F5F0E8] min-h-screen text-[#191c22] font-sans relative overflow-hidden">

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 sm:px-8 h-16 bg-white/80 backdrop-blur-xl border-b border-[#d2c5ae]/20">
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="font-display text-lg sm:text-xl font-black tracking-tight cursor-pointer flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-xl bg-[#006a65] flex items-center justify-center text-white font-black text-sm shadow-md shadow-[#006a65]/20">
            N
          </div>
          <span className="text-[#006a65]">{t.app.name}</span>
        </div>
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="w-8 h-8 rounded-full bg-white/90 border border-[#d2c5ae]/20 shadow-sm flex items-center justify-center cursor-pointer hover:shadow-md transition-all"
              >
                <Globe className="w-4 h-4 text-[#006a65]" />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-[#d2c5ae]/20 py-1 z-50 min-w-[120px]">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                        language === lang.code
                          ? "bg-[#006a65] text-white"
                          : "text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      {lang.native}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={onViewProfile}
              className="flex items-center gap-2 bg-white/90 px-3 py-1.5 rounded-full border border-[#d2c5ae]/20 shadow-sm cursor-pointer hover:shadow-md transition-all"
            >
              <span className="text-xs font-bold text-zinc-900 truncate max-w-[100px]">{user.displayName}</span>
              <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full border-2 border-white object-cover" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="w-8 h-8 rounded-full bg-white/90 border border-[#d2c5ae]/20 shadow-sm flex items-center justify-center cursor-pointer hover:shadow-md transition-all"
              >
                <Globe className="w-4 h-4 text-[#006a65]" />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-[#d2c5ae]/20 py-1 z-50 min-w-[120px]">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                        language === lang.code
                          ? "bg-[#006a65] text-white"
                          : "text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      {lang.native}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onLogin} className="text-xs font-bold text-[#006a65] cursor-pointer hover:underline">
              {t.landing.login}
            </button>
            <button onClick={onSignup} className="text-xs font-bold bg-[#006a65] text-white px-5 py-2 rounded-full cursor-pointer shadow-md shadow-[#006a65]/20 hover:bg-[#005551] transition-all">
              {t.landing.signup}
            </button>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative w-full min-h-[92vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${mapBg})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/40 to-[#F5F0E8]" />

        {/* Floating accent shapes */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#f0c040]/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#006a65]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-24 pb-16">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-sm sm:text-base text-[#006a65] font-black uppercase tracking-widest mb-4"
          >
            {t.app.tagline}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, type: "spring" }}
            className="font-display text-5xl sm:text-7xl md:text-8xl font-black text-[#006a65] tracking-tighter leading-[0.9] uppercase"
          >
            {t.app.name}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-5 text-base sm:text-lg text-[#4e4635] max-w-xl mx-auto leading-relaxed font-medium"
          >
            {t.landing.heroDescription}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-row gap-3 mt-8 w-full max-w-sm mx-auto"
          >
            {isAuthenticated ? (
              <>
                <button onClick={onStartMission} className="flex-1 bg-[#f0c040] text-[#251a00] font-black text-sm sm:text-xs uppercase tracking-widest h-14 sm:h-13 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#f0c040]/20 cursor-pointer hover:scale-105 active:scale-95 transition-all">
                  {t.landing.startMission}
                  <Rocket className="w-4 h-4" style={{ fill: "currentColor" }} />
                </button>
                <button onClick={onViewLeaderboard} className="flex-1 border-2 border-[#006a65] bg-white text-[#006a65] font-black text-sm sm:text-xs uppercase tracking-widest h-14 sm:h-13 rounded-2xl flex items-center justify-center gap-2 cursor-pointer hover:bg-[#006a65]/5 transition-all">
                  {t.landing.viewLeaderboard}
                  <Trophy className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button onClick={onSignup} className="flex-1 bg-[#006a65] text-white font-black text-sm sm:text-xs uppercase tracking-widest h-14 sm:h-13 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#006a65]/20 cursor-pointer hover:bg-[#005551] transition-all">
                  {t.landing.signup}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={onLogin} className="flex-1 border-2 border-[#006a65] bg-white text-[#006a65] font-black text-sm sm:text-xs uppercase tracking-widest h-14 sm:h-13 rounded-2xl flex items-center justify-center gap-2 cursor-pointer hover:bg-[#006a65]/5 transition-all">
                  {t.landing.login}
                </button>
              </>
            )}
          </motion.div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce">
          <ChevronRight className="w-4 h-4 text-[#006a65]/50 rotate-90" />
        </div>
      </section>

      {/* How It Works — Step flow */}
      <section className="px-4 sm:px-8 max-w-5xl mx-auto mt-16 sm:mt-24">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-2xl bg-[#f0c040] flex items-center justify-center shadow-md shadow-[#f0c040]/20">
            <MapPin className="w-5 h-5 text-[#251a00]" />
          </div>
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-black uppercase text-zinc-900">{t.landing.featuresTitle}</h2>
            <p className="text-xs text-[#4e4635]">From snapshot to municipal action in three steps</p>
          </div>
        </div>

        <div className="md:grid md:grid-cols-3 md:gap-6">
          <StickyCardStack>
            {[
              { icon: Camera, color: "#f0c040", title: t.landing.spotTitle, desc: t.landing.spotDesc, num: "01" },
              { icon: Brain, color: "#006a65", title: t.landing.verifyTitle, desc: t.landing.verifyDesc, num: "02" },
              { icon: ShieldCheck, color: "#6366f1", title: t.landing.dispatcherTitle, desc: t.landing.dispatcherDesc, num: "03" }
            ].map((step) => (
              <div key={step.num} className="bg-white rounded-3xl p-6 border border-[#d2c5ae]/20 shadow-sm relative group transition-all duration-300">
                <span className="text-[64px] font-black text-zinc-100 absolute top-3 right-5 leading-none select-none">{step.num}</span>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: `${step.color}15` }}>
                  <step.icon className="w-5 h-5" style={{ color: step.color }} />
                </div>
                <h3 className="font-bold text-sm text-zinc-900 mb-1">{step.title}</h3>
                <p className="text-xs text-[#4e4635] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </StickyCardStack>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="px-4 sm:px-8 max-w-5xl mx-auto mt-16">
        <div className="bg-[#006a65] rounded-3xl p-8 sm:p-10 text-white grid grid-cols-2 md:grid-cols-4 gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          {[
            { value: "14,295", label: t.landing.issuesDispatched },
            { value: "85%", label: t.landing.weeklyGoal },
            { value: "4", label: "AI Agents" },
            { value: "24/7", label: "Monitoring" }
          ].map((stat) => (
            <div key={stat.label} className="text-center relative z-10">
              <h3 className="font-display text-2xl sm:text-3xl font-black">{stat.value}</h3>
              <p className="text-[10px] uppercase font-bold text-white/70 mt-1 tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Core Feature — Gemini Inspector */}
      <section className="px-4 sm:px-8 max-w-5xl mx-auto mt-16 sm:mt-24">
        <div className="bg-white rounded-3xl border border-[#d2c5ae]/20 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2">
          <div className="p-8 sm:p-10 flex flex-col justify-center">
            <span className="inline-block px-3 py-1 rounded-full bg-[#006a65]/10 text-[#006a65] text-[10px] font-bold uppercase tracking-wider mb-4 w-fit">
              {t.landing.citizenFirst}
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-black text-zinc-900 mb-3">{t.landing.geminiTitle}</h2>
            <p className="text-sm text-[#4e4635] leading-relaxed mb-6">{t.landing.geminiDesc}</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#006a65]">
                <Check className="w-3.5 h-3.5" /> Fraud Detection
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#006a65]">
                <Check className="w-3.5 h-3.5" /> Severity Scoring
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#006a65]">
                <Check className="w-3.5 h-3.5" /> Auto-Classify
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#006a65]/5 to-[#006a65]/10 flex items-center justify-center p-8">
            <div className="w-full max-w-xs aspect-square bg-white rounded-3xl border border-[#006a65]/15 shadow-lg flex flex-col items-center justify-center gap-4 p-6">
              <Brain className="w-12 h-12 text-[#006a65]" />
              <div className="text-center">
                <p className="text-sm font-black text-zinc-900">Gemini AI Engine</p>
                <p className="text-[10px] text-zinc-400 mt-1">Server-side vision analysis</p>
              </div>
              <div className="flex gap-1.5">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-[#006a65]/20" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gamification Features */}
      <section className="px-4 sm:px-8 max-w-5xl mx-auto mt-16 sm:mt-24">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-5 h-5 text-[#f0c040]" />
            <h2 className="font-display text-xl sm:text-2xl font-black uppercase text-zinc-900">{t.landing.gamificationTitle}</h2>
          </div>
          <p className="text-xs text-[#4e4635] max-w-xl">{t.landing.gamificationSubtitle}</p>
        </div>

        <div className="md:grid md:grid-cols-4 md:gap-6">
          <StickyCardStack>
            {[
              { icon: Navigation, color: "#006a65", bg: "bg-[#006a65]/10", title: t.landing.safeMapsTitle, desc: t.landing.safeMapsDesc, tagIcon: MapPin, tagColor: "#006a65", tag: "Hazard-Aware Routing" },
              { icon: MessageCircle, color: "rgb(147,51,234)", bg: "bg-purple-500/10", title: t.landing.communityTitle, desc: t.landing.communityDesc, tagIcon: Users, tagColor: "rgb(147,51,234)", tag: "+3 XP per Message" },
              { icon: Star, color: "#d4a017", bg: "bg-[#f0c040]/15", title: t.landing.scoutLevelsTitle, desc: t.landing.scoutLevelsDesc, tagIcon: Trophy, tagColor: "#d4a017", tag: "8 Scout Ranks" },
              { icon: Globe, color: "rgb(37,99,235)", bg: "bg-blue-500/10", title: t.landing.languageSupportTitle, desc: t.landing.languageSupportDesc, tagIcon: Globe, tagColor: "rgb(37,99,235)", tag: "EN / HI / TE" }
            ].map((card) => (
              <div key={card.title} className="bg-white rounded-3xl p-6 border border-[#d2c5ae]/20 shadow-sm group transition-all duration-300">
                <div className={`w-11 h-11 rounded-2xl ${card.bg} flex items-center justify-center mb-4`}>
                  <card.icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                <h3 className="font-bold text-sm text-zinc-900 mb-1">{card.title}</h3>
                <p className="text-xs text-[#4e4635] leading-relaxed">{card.desc}</p>
                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center gap-1.5">
                  <card.tagIcon className="w-3 h-3" style={{ color: card.tagColor }} />
                  <span className="text-[10px] font-bold uppercase" style={{ color: card.tagColor }}>{card.tag}</span>
                </div>
              </div>
            ))}
          </StickyCardStack>
        </div>
      </section>

      {/* AI Agents — 4 active */}
      <section className="px-4 sm:px-8 max-w-5xl mx-auto mt-16 sm:mt-24">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Cpu className="w-5 h-5 text-purple-600" />
            <h2 className="font-display text-xl sm:text-2xl font-black uppercase text-zinc-900">{t.landing.agentsTitle}</h2>
          </div>
          <p className="text-xs text-[#4e4635] max-w-xl">{t.landing.agentsSubtitle}</p>
        </div>

        <div className="md:grid md:grid-cols-2 md:gap-4">
          <StickyCardStack>
            {[
              { icon: Camera, color: "purple", title: t.landing.scannerTitle, sub: t.landing.scannerSubtitle, desc: t.landing.scannerDesc, engine: t.landing.scannerEngine },
              { icon: Send, color: "emerald", title: t.landing.dispatcherTitle, sub: t.landing.dispatcherSubtitle, desc: t.landing.dispatcherDesc, engine: t.landing.dispatcherEngine },
              { icon: ShieldCheck, color: "blue", title: t.landing.moderatorTitle, sub: t.landing.moderatorSubtitle, desc: t.landing.moderatorDesc, engine: t.landing.moderatorEngine },
              { icon: Award, color: "rose", title: t.landing.rewardTitle, sub: t.landing.rewardSubtitle, desc: t.landing.rewardDesc, engine: t.landing.rewardEngine }
            ].map((agent) => {
              const colorMap: Record<string, { bg: string; text: string; border: string }> = {
                purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100" },
                emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
                blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
                rose: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100" }
              };
              const c = colorMap[agent.color];
              return (
                <div key={agent.title} className={`bg-white rounded-2xl p-5 border border-[#d2c5ae]/20 shadow-sm transition-all duration-300`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                      <agent.icon className={`w-5 h-5 ${c.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-zinc-900">{agent.title}</h4>
                      <span className={`text-[9px] font-mono font-bold ${c.text} uppercase`}>{agent.sub}</span>
                      <p className="text-[11px] text-[#4e4635] leading-relaxed mt-1.5">{agent.desc}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-[9px] font-mono text-zinc-400">{t.landing.aiBackendEngine}</span>
                    <span className="text-[9px] font-bold text-zinc-600">{agent.engine}</span>
                  </div>
                </div>
              );
            })}
          </StickyCardStack>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-8 max-w-5xl mx-auto mt-16 sm:mt-24 mb-16">
        <div className="bg-[#191c22] rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-48 h-48 bg-[#f0c040]/10 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#006a65]/10 rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none" />

          <h2 className="font-display text-2xl sm:text-3xl font-black text-white uppercase tracking-tight relative z-10">
            {t.landing.ctaTitle}
          </h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto mt-3 leading-relaxed relative z-10">
            {t.landing.ctaSubtitle}
          </p>
          <button
            onClick={isAuthenticated ? onStartMission : onSignup}
            className="mt-8 bg-[#f0c040] text-[#251a00] font-black text-xs uppercase tracking-widest px-10 py-4 rounded-2xl shadow-lg shadow-[#f0c040]/20 cursor-pointer hover:scale-105 active:scale-95 transition-all relative z-10"
          >
            {isAuthenticated ? t.landing.startMission : t.landing.joinMovement}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#d2c5ae]/20 py-6 px-4 sm:px-8 text-center">
        <p className="text-[10px] text-zinc-400 font-medium">
          NAGARIKA — Citizen Reporting Platform. Built for safer cities.
        </p>
      </footer>
    </div>
  );
}
