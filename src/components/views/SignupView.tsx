import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';

const CITY_DATA: Record<string, string[]> = {
  "Hyderabad": ["Tirumalagiri", "Secunderabad", "Ameerpet", "Kukatpally", "Gachibowli", "Madhapur", "Begumpet", "Banjara Hills", "Jubilee Hills", "Malkajgiri", "LB Nagar", "Dilsukhnagar", "Uppal", "Miyapur", "Kompally", "Mehdipatnam", "Tarnaka", "Habsiguda"],
  "Bangalore": ["Koramangala", "Indiranagar", "Whitefield", "HSR Layout", "JP Nagar", "BTM Layout", "Marathahalli", "Electronic City", "Jayanagar", "Malleshwaram", "Rajajinagar", "Yelahanka", "Hebbal", "Banashankari"],
  "Mumbai": ["Andheri", "Bandra", "Borivali", "Dadar", "Goregaon", "Juhu", "Kandivali", "Malad", "Powai", "Thane", "Vashi", "Worli", "Colaba", "Kurla", "Vikhroli"],
  "Delhi": ["Connaught Place", "Karol Bagh", "Lajpat Nagar", "Dwarka", "Rohini", "Pitampura", "Janakpuri", "Saket", "Vasant Kunj", "Hauz Khas", "Greater Kailash", "Nehru Place", "Rajouri Garden"],
  "Chennai": ["T Nagar", "Adyar", "Anna Nagar", "Velachery", "Tambaram", "Porur", "Guindy", "Mylapore", "Nungambakkam", "Chromepet", "Perambur", "Thiruvanmiyur"],
  "Pune": ["Kothrud", "Hinjewadi", "Viman Nagar", "Wakad", "Baner", "Aundh", "Shivajinagar", "Hadapsar", "Kharadi", "Pimpri-Chinchwad", "Deccan", "Sinhagad Road"],
  "Kolkata": ["Salt Lake", "Park Street", "New Town", "Howrah", "Dum Dum", "Jadavpur", "Ballygunge", "Gariahat", "Tollygunge", "Behala", "Baranagar"],
  "Ahmedabad": ["Navrangpura", "Satellite", "SG Highway", "Prahlad Nagar", "Vastrapur", "Maninagar", "Bopal", "Gota", "Thaltej", "Chandkheda"],
  "Jaipur": ["Malviya Nagar", "Vaishali Nagar", "C Scheme", "Mansarovar", "Jagatpura", "Pratap Nagar", "Tonk Road", "Ajmer Road", "Bani Park"],
  "Lucknow": ["Gomti Nagar", "Hazratganj", "Aliganj", "Indira Nagar", "Alambagh", "Chinhat", "Mahanagar", "Vikas Nagar", "Jankipuram"],
  "Visakhapatnam": ["Gajuwaka", "Dwaraka Nagar", "MVP Colony", "Madhurawada", "Seethammadhara", "Pendurthi", "Rushikonda", "NAD Junction"],
  "Indore": ["Vijay Nagar", "Palasia", "Sapna Sangeeta", "Bhawarkua", "AB Road", "MR 10", "Rajendra Nagar", "Sudama Nagar"]
};

export default function SignupView({ onSwitchToLogin, onGoHome }: { onSwitchToLogin: () => void, onGoHome: () => void }) {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const [selectedCity, setSelectedCity] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [customArea, setCustomArea] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [customAreaQuery, setCustomAreaQuery] = useState('');
  const [customAreaSuggestions, setCustomAreaSuggestions] = useState<string[]>([]);
  const [customAreaError, setCustomAreaError] = useState('');
  const [isSearchingArea, setIsSearchingArea] = useState(false);
  const [areaValidated, setAreaValidated] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username.length < 3) return setError('Username must be at least 3 characters');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');

    setStep(2);
  };

  const handleAutoLocate = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setSignupLoading(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const geoapifyKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
        if (!geoapifyKey) {
          setCustomAreaError("Location search unavailable. Please select an area from the list.");
          setSignupLoading(false);
          return;
        }
        const res = await fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${geoapifyKey}`);
        const data = await res.json();

        let foundCity = "Bangalore";
        let foundArea = "Your Area";

        if (data.features && data.features.length > 0) {
          const props = data.features[0].properties;
          foundCity = props.city || props.county || props.state_district || "Bangalore";
          foundArea = props.suburb || props.neighbourhood || props.district || props.city_district || "Your Area";
        }

        setSelectedCity(foundCity);
        setCustomArea(foundArea);
        setAreaValidated(true);
        setStep(3);
      } catch (e) {
        console.error("Auto locate failed", e);
        setCustomAreaError("Auto-locate failed. Please select from the lists above.");
      } finally {
        setSignupLoading(false);
      }
    }, (error) => {
      console.error(error);
      setSignupLoading(false);
      alert("Could not access your location. Please select manually.");
    });
  };

  const searchAreaSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setCustomAreaSuggestions([]);
      setCustomAreaError('');
      return;
    }
    setIsSearchingArea(true);
    setCustomAreaError('');
    try {
      const geoapifyKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
      if (!geoapifyKey) {
        setCustomAreaError('Location search unavailable. Please select from the list above or use Auto-Locate.');
        setCustomAreaSuggestions([]);
        setIsSearchingArea(false);
        return;
      }
      const res = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query + ', ' + selectedCity + ', India')}&filter=countrycode:in&limit=5&apiKey=${geoapifyKey}`
      );
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const suggestions: string[] = data.features
          .map((f: any) => f.properties.suburb || f.properties.neighbourhood || f.properties.district || f.properties.city_district || f.properties.name || f.properties.locality || f.properties.county || f.properties.state_district || '')
          .filter(Boolean)
          .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
        setCustomAreaSuggestions(suggestions);
        if (suggestions.length === 0) {
          setCustomAreaError('No matching area found. Please use Auto-Locate or select from the list above.');
        }
      } else {
        setCustomAreaSuggestions([]);
        setCustomAreaError('No matching area found. Please use Auto-Locate or select from the list above.');
      }
    } catch (e) {
      setCustomAreaSuggestions([]);
      setCustomAreaError('Search failed. Please use Auto-Locate or select from the list above.');
    } finally {
      setIsSearchingArea(false);
    }
  };

  const searchCitySuggestions = async (query: string) => {
    if (query.trim().length < 2) { setCitySuggestions([]); return; }
    const geoapifyKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
    if (!geoapifyKey) { setCitySuggestions([]); return; }
    setIsSearchingCity(true);
    try {
      const res = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query + ', India')}&filter=countrycode:in&limit=5&apiKey=${geoapifyKey}`
      );
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const suggestions: string[] = data.features
          .map((f: any) => f.properties.city || f.properties.name || '')
          .filter(Boolean)
          .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
        setCitySuggestions(suggestions);
      } else {
        setCitySuggestions([]);
      }
    } catch {
      setCitySuggestions([]);
    } finally {
      setIsSearchingCity(false);
    }
  };

  const createAccountAndSave = async () => {
    const finalArea = customArea || selectedArea;
    if (!selectedCity || !finalArea || !areaValidated) return;
    if (!auth.currentUser) return;

    setSignupLoading(true);
    setError('');

    const communityId = selectedCity.toLowerCase().replace(/\s+/g, '_');

    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        uid: auth.currentUser.uid,
        username: username,
        email: email,
        phone: phone,
        city: selectedCity,
        area: finalArea,
        communityId: communityId,
        xp: 0,
        level: 1,
        coins: 200,
        trustScore: 50,
        totalReports: 0,
        totalVerifications: 0,
        totalResolved: 0,
        badges: [],
        avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${username}`,
        warningsCount: 0,
        isBlocked: false,
        isAdmin: email === "admin@civicsuccedent.com",
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp()
      });

      const communityRef = doc(db, 'communities', communityId);
      const communityDoc = await getDoc(communityRef);

      if (communityDoc.exists()) {
        await updateDoc(communityRef, { memberCount: increment(1) });
      } else {
        await setDoc(communityRef, {
          communityId: communityId,
          name: `${selectedCity} Community`,
          city: selectedCity,
          memberCount: 1,
          healthScore: 100,
          totalCases: 0,
          resolvedCases: 0,
          createdAt: serverTimestamp()
        });
      }

      localStorage.removeItem('temp_signup_phone');
      window.location.replace("#patrol");
    } catch (err) {
      console.error("Error saving user data", err);
      setError('Failed to save profile. Please try again.');
      setSignupLoading(false);
    }
  };

  const handleFinalSignup = async () => {
    const finalArea = customArea || selectedArea;
    if (!selectedCity || !finalArea || !areaValidated) return;

    setSignupLoading(true);
    setError('');

    if (auth.currentUser) {
      await createAccountAndSave();
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: username });
      localStorage.setItem('temp_signup_phone', phone);
      await createAccountAndSave();
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setError('Email is already registered');
      else if (err.code === 'auth/invalid-email') setError('Invalid email format');
      else setError(err.message || 'Signup failed');
      setSignupLoading(false);
    }
  };

  useEffect(() => {
    if (auth.currentUser && step === 1 && !signupLoading) {
      setError('');
    }
  }, [auth.currentUser]);

  return (
    <div className="bg-[#F5F0E8] min-h-screen font-sans flex flex-col justify-center items-center text-[#191c22] p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-zinc-150">
        <div className="text-center mb-6">
          <h1
            onClick={onGoHome}
            className="font-display text-2xl font-black uppercase tracking-widest text-[#775a00] cursor-pointer hover:opacity-80 transition-opacity"
          >
            CIVIC SUCCEDENT
          </h1>
          <p className="text-sm text-zinc-500 font-bold mt-2">
            {step === 1 ? "Join your city's heroes" : step === 2 ? "Where are you located?" : "Ready to start!"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleAccountSubmit} className="space-y-3">
            <div>
              <label htmlFor="signup-username" className="block text-xs font-bold text-zinc-600 mb-1">Username</label>
              <input
                id="signup-username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f0c040]/50"
                placeholder="Enter display name"
                required
              />
            </div>
            <div>
              <label htmlFor="signup-email" className="block text-xs font-bold text-zinc-600 mb-1">Email</label>
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f0c040]/50"
                placeholder="your@email.com"
                required
              />
            </div>
            <div>
              <label htmlFor="signup-phone" className="block text-xs font-bold text-zinc-600 mb-1">Phone Number (optional)</label>
              <input
                id="signup-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f0c040]/50"
                placeholder="+91 9876543210"
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="block text-xs font-bold text-zinc-600 mb-1">Password</label>
              <input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f0c040]/50"
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label htmlFor="signup-confirm-password" className="block text-xs font-bold text-zinc-600 mb-1">Confirm Password</label>
              <input
                id="signup-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f0c040]/50"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#006a65] text-white py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-teal-700 transition-colors mt-4"
            >
              NEXT — SELECT LOCATION
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-black mb-1">What area do you live in?</h2>
              <p className="text-sm text-zinc-500">Choose your city and neighborhood</p>
            </div>

            {!selectedCity ? (
              <div className="space-y-3">
                <button
                  onClick={handleAutoLocate}
                  disabled={signupLoading}
                  className="w-full bg-[#006a65] text-white py-3 rounded-xl font-bold text-sm hover:bg-teal-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {signupLoading ? "Locating..." : "📍 Auto-Locate Me"}
                </button>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-zinc-200"></div>
                  <span className="flex-shrink-0 mx-4 text-zinc-400 text-xs font-bold uppercase">Or choose manually</span>
                  <div className="flex-grow border-t border-zinc-200"></div>
                </div>

                <input
                  type="text"
                  value={cityQuery}
                  onChange={(e) => { setCityQuery(e.target.value); if (e.target.value.trim().length >= 2) { searchCitySuggestions(e.target.value); } else { setCitySuggestions([]); } }}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f0c040]/50"
                  placeholder="Search for your city..."
                />
                <p className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Popular Cities</p>
                <div className="flex flex-wrap gap-2 max-h-[28vh] overflow-y-auto">
                  {Object.keys(CITY_DATA).filter(c => !cityQuery || c.toLowerCase().includes(cityQuery.toLowerCase())).map(city => (
                    <button
                      key={city}
                      onClick={() => { setSelectedCity(city); setCityQuery(''); setCitySuggestions([]); }}
                      className="px-4 py-2 border border-zinc-200 rounded-xl text-sm hover:bg-[#f0c040]/10 hover:border-[#f0c040] transition-colors font-medium"
                    >
                      {city}
                    </button>
                  ))}
                </div>
                {citySuggestions.length > 0 && (
                  <div className="mt-1">
                    <p className="text-xs font-bold uppercase text-zinc-400 tracking-wider mb-1">Other cities</p>
                    <div className="flex flex-wrap gap-2">
                      {citySuggestions.filter(s => !Object.keys(CITY_DATA).includes(s)).map(city => (
                        <button
                          key={city}
                          onClick={() => { setSelectedCity(city); setCityQuery(''); setCitySuggestions([]); }}
                          className="px-4 py-2 border border-dashed border-[#006a65] rounded-xl text-sm hover:bg-[#006a65]/10 transition-colors font-medium text-[#006a65]"
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {isSearchingCity && <p className="text-xs text-zinc-400 mt-1">Searching...</p>}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-zinc-500">
                    City: <span className="text-zinc-800">{selectedCity}</span>
                  </p>
                  <button
                    onClick={() => { setSelectedCity(''); setSelectedArea(''); setCustomArea(''); setCustomAreaSuggestions([]); setCustomAreaError(''); setAreaValidated(false); setCityQuery(''); setCitySuggestions([]); }}
                    className="text-xs text-zinc-400 hover:text-zinc-600"
                  >
                    Change city →
                  </button>
                </div>

                <button
                  onClick={handleAutoLocate}
                  disabled={signupLoading}
                  className="w-full bg-[#006a65] text-white py-2.5 rounded-xl font-bold text-sm hover:bg-teal-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {signupLoading ? "Locating..." : "📍 Auto-Locate My Area"}
                </button>

                <div className="flex flex-wrap gap-2 max-h-[30vh] overflow-y-auto">
                  {(CITY_DATA[selectedCity] || []).map(area => (
                    <button
                      key={area}
                      onClick={() => { setSelectedArea(area); setCustomArea(''); setCustomAreaQuery(''); setCustomAreaSuggestions([]); setAreaValidated(true); setStep(3); }}
                      className="px-3 py-1.5 border border-zinc-200 rounded-xl text-sm hover:bg-[#006a65]/10 hover:border-[#006a65] transition-colors"
                    >
                      {area}
                    </button>
                  ))}
                </div>

                <div className="pt-4 border-t border-zinc-100">
                  <label className="block text-xs font-bold text-zinc-600 mb-1">
                    Not listed? Search for your area (verified locations only):
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="signup-custom-area"
                      name="customAreaSearch"
                      type="text"
                      autoComplete="off"
                      value={customAreaQuery}
                      onChange={(e) => {
                        setCustomAreaQuery(e.target.value);
                        setCustomArea('');
                        setSelectedArea('');
                        setCustomAreaError('');
                        setCustomAreaSuggestions([]);
                        setAreaValidated(false);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchAreaSuggestions(customAreaQuery); } }}
                      className="flex-1 border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f0c040]/50"
                      placeholder="Type area name to search..."
                    />
                    <button
                      onClick={() => searchAreaSuggestions(customAreaQuery)}
                      disabled={isSearchingArea || customAreaQuery.trim().length < 3}
                      className="bg-zinc-900 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 whitespace-nowrap"
                    >
                      {isSearchingArea ? '...' : 'Search'}
                    </button>
                  </div>
                  {customAreaError && (
                    <p className="text-xs text-red-500 mt-2 font-semibold">{customAreaError}</p>
                  )}
                  {customAreaSuggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {customAreaSuggestions.map(s => (
                        <button
                          key={s}
                          onClick={() => { setCustomArea(s); setCustomAreaQuery(s); setSelectedArea(''); setCustomAreaSuggestions([]); setCustomAreaError(''); setAreaValidated(true); setStep(3); }}
                          className="px-3 py-1.5 border border-[#006a65] bg-[#006a65]/5 rounded-xl text-sm hover:bg-[#006a65]/15 transition-colors font-medium text-[#006a65]"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                  {customArea && (
                    <p className="text-xs text-[#006a65] mt-2 font-bold">✓ Selected: {customArea}</p>
                  )}
                </div>

                <button onClick={() => setSelectedCity('')} className="text-xs text-zinc-400 hover:text-zinc-600 block">
                  ← Back to city selection
                </button>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-[#e1fbf2] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎯</span>
            </div>

            <div>
              <h2 className="font-display text-2xl font-black uppercase text-[#006a65]">You're joining</h2>
              <p className="text-xl font-bold mt-1">{selectedCity.toUpperCase()} COMMUNITY</p>
              <p className="text-sm text-zinc-500 mt-2">Area: {customArea || selectedArea}</p>
            </div>

            <button
              onClick={handleFinalSignup}
              disabled={signupLoading}
              className="w-full bg-[#006a65] text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-teal-700 transition-colors shadow-lg"
            >
              {signupLoading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT & START PATROLLING"}
            </button>

            <button onClick={() => setStep(2)} className="text-xs text-zinc-400 hover:text-zinc-600 mt-4 block mx-auto">
              ← Change area
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={onSwitchToLogin}
            className="text-xs font-bold text-zinc-500 hover:text-[#006a65]"
          >
            Already have an account? Login
          </button>
        </div>
      </div>
    </div>
  );
}
