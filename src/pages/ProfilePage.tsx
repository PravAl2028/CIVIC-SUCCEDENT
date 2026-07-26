import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage, LANGUAGES } from "../context/LanguageContext";
import ProfileView from "../components/views/ProfileView";
import { Globe } from "lucide-react";

export default function ProfilePage() {
  const { user, cases } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <div className="pt-5 pb-28 px-4 max-w-lg mx-auto space-y-3">
      {/* Language Switcher Card */}
      <div className="bg-white rounded-3xl border border-[#d2c5ae]/30 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-[#006a65]" />
          <span className="text-xs font-bold text-zinc-600 uppercase">{t.profile.language}</span>
        </div>
        <div className="flex gap-2">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                language === lang.code
                  ? "bg-[#006a65] text-white shadow-md"
                  : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              {lang.native}
            </button>
          ))}
        </div>
      </div>

      <ProfileView
        key={`profile-${user.userId}`}
        user={user}
        cases={cases}
        onReset={async () => { navigate("/"); }}
      />
    </div>
  );
}
