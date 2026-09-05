import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  User as UserIcon,
  Building,
  Briefcase,
  Clock,
  AlertCircle,
  RefreshCw,
  Activity,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

const ROLES = [
  'Statistical Analyst',
  'Data Collector',
  'IT Officer',
  'Director / Senior Statistician',
];

const DEPARTMENTS = [
  'Ministry of Statistics & Programme Implementation (MoSPI)',
  'NSSO - Field Operations Division (FOD)',
  'National Statistical Commission (NSC)',
  'National Statistical Systems Training Academy (NSSTA)',
  'State Directorate of Economics & Statistics (DES)',
];

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const { login, signup, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Statistical Analyst');
  const [department, setDepartment] = useState('Ministry of Statistics & Programme Implementation (MoSPI)');
  const [experienceYears, setExperienceYears] = useState<number>(3);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fromPath = (location.state as any)?.from?.pathname || '/';

  const validateFields = () => {
    const errs: { name?: string; email?: string; password?: string } = {};
    if (!isLogin && !name.trim()) {
      errs.name = 'Please provide your full official name & cadre title.';
    }
    if (!email.trim()) {
      errs.email = 'Official email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Please enter a valid official email address format (e.g. officer@nic.in).';
    }
    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters in length.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateFields()) {
      return;
    }

    try {
      if (isLogin) {
        await login(email, password);
        navigate(fromPath, { replace: true });
      } else {
        await signup(name, email, password, role, department, experienceYears);
        // Direct new registrants straight to the onboarding competency builder!
        navigate('/onboarding', { replace: true });
      }
    } catch (err: any) {
      console.error('Authentication failed:', err);
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string') {
        setErrorMessage(detail);
      } else if (Array.isArray(detail) && detail[0]?.msg) {
        setErrorMessage(detail[0].msg);
      } else {
        setErrorMessage(isLogin ? 'Authentication failed. Please check credentials or user role.' : 'Registration failed. Email might already be registered.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col justify-between">
      {/* Top Banner Ribbon */}
      <div className="bg-gradient-to-r from-[#FF6500] via-[#FFFFFF] to-[#059669] h-1.5 w-full"></div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-md space-y-6">
          {/* Header Brand */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl shadow-blue-500/20 border border-blue-400/30 mb-2">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">StatSkill AI</h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              National Statistical Competency & Learning Intelligence Portal (SIH PS 26101)
            </p>
          </div>

          {/* Card Container */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
            {/* Toggle Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setErrorMessage(null);
                }}
                className={`py-2 rounded-lg transition-all ${
                  isLogin
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Official Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setErrorMessage(null);
                }}
                className={`py-2 rounded-lg transition-all ${
                  !isLogin
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                New Officer Registration
              </button>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="flex items-start space-x-2.5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Full Name & Designation
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: undefined });
                      }}
                      placeholder="e.g. Dr. Rajesh Verma, ISS"
                      className={`w-full pl-9 pr-3 py-2 bg-slate-950 border rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none transition-colors ${
                        fieldErrors.name
                          ? 'border-rose-500 focus:border-rose-400'
                          : 'border-slate-800 focus:border-blue-500'
                      }`}
                    />
                  </div>
                  {fieldErrors.name && (
                    <p className="text-[11px] text-rose-400 font-medium mt-1">{fieldErrors.name}</p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Government / Official Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                    }}
                    placeholder="officer@nic.in or your email"
                    className={`w-full pl-9 pr-3 py-2 bg-slate-950 border rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none transition-colors ${
                      fieldErrors.email
                        ? 'border-rose-500 focus:border-rose-400'
                        : 'border-slate-800 focus:border-blue-500'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-[11px] text-rose-400 font-medium mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                    }}
                    placeholder="••••••••"
                    className={`w-full pl-9 pr-10 py-2 bg-slate-950 border rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none transition-colors ${
                      fieldErrors.password
                        ? 'border-rose-500 focus:border-rose-400'
                        : 'border-slate-800 focus:border-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-[11px] text-rose-400 font-medium mt-1">{fieldErrors.password}</p>
                )}
              </div>

              {!isLogin && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Cadre / Primary Role
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 appearance-none transition-colors"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Administrative Department
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 appearance-none transition-colors"
                      >
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-slate-300">Years of Experience</label>
                      <span className="text-blue-400 font-bold">{experienceYears} Years</span>
                    </div>
                    <div className="relative flex items-center">
                      <Clock className="w-4 h-4 text-slate-500 absolute left-3" />
                      <input
                        type="number"
                        min="0"
                        max="45"
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(parseInt(e.target.value) || 0)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing authentication...</span>
                  </>
                ) : (
                  <span>{isLogin ? 'Sign In to Portal' : 'Register & Start Competency Onboarding'}</span>
                )}
              </button>

              {/* 1-Click Demo Fill for SIH Evaluators */}
              {isLogin && (
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Evaluator 1-Click Demo Profiles:</span>
                    </span>
                    <span className="text-amber-400 font-semibold text-[10px]">Instant Credentials</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('analyst@mospi.gov.in');
                        setPassword('password123');
                        setFieldErrors({});
                        setErrorMessage(null);
                      }}
                      className="py-2 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/90 text-sky-300 border border-slate-700 text-[11px] font-semibold transition flex flex-col items-center"
                    >
                      <span>Statistical Analyst</span>
                      <span className="text-[9px] text-slate-400 font-normal">NAD / MoSPI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('director@mospi.gov.in');
                        setPassword('password123');
                        setFieldErrors({});
                        setErrorMessage(null);
                      }}
                      className="py-2 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/90 text-emerald-300 border border-slate-700 text-[11px] font-semibold transition flex flex-col items-center"
                    >
                      <span>Director (Admin)</span>
                      <span className="text-[9px] text-slate-400 font-normal">MoSPI HQ Admin</span>
                    </button>
                  </div>
                </div>
              )}
            </form>

            {/* GovTech Platform Guarantee */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center space-x-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>MoSPI / Mission Karmayogi Standard Authentication</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        StatSkill AI • Smart India Hackathon 2024 / 2026 (PS 26101) • 100% Free-Tier Architecture
      </footer>
    </div>
  );
};
