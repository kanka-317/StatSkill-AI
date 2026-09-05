import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import {
  getCompetencyFrameworkApi,
  getRoleBenchmarkApi,
  submitOnboardingApi,
} from '../services/api';
import type {
  CompetencyFramework,
  RoleBenchmark,
  OnboardingPayload,
} from '../types';
import {
  Sliders,
  CheckCircle2,
  AlertCircle,
  Building,
  Briefcase,
  Clock,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  BarChart2,
  RefreshCw,
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

export const OnboardingPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Wizard Step: 1 = Role & Dept, 2 = Skill Sliders, 3 = Review & Submit
  const [step, setStep] = useState<number>(1);

  // Profile data - Ensure initial role is always one of the valid framework roles
  const initialRole = ROLES.includes(user?.role || '') ? (user?.role as string) : 'Statistical Analyst';
  const [selectedRole, setSelectedRole] = useState<string>(initialRole);
  const [selectedDepartment, setSelectedDepartment] = useState<string>(
    user?.department || 'Ministry of Statistics & Programme Implementation (MoSPI)'
  );
  const [experienceYears, setExperienceYears] = useState<number>(user?.experience_years || 2);

  // Framework and ratings state
  const [framework, setFramework] = useState<CompetencyFramework | null>(null);
  const [benchmark, setBenchmark] = useState<RoleBenchmark | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [activeDomainIndex, setActiveDomainIndex] = useState<number>(0);

  // Loading and error
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load Framework on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const fw = await getCompetencyFrameworkApi();
        setFramework(fw);

        // Fetch benchmarks for role (with automatic fallback to Statistical Analyst if not found)
        let bm: RoleBenchmark;
        try {
          bm = await getRoleBenchmarkApi(selectedRole);
        } catch (benchmarkErr) {
          console.warn(`Benchmark for '${selectedRole}' not found, defaulting to Statistical Analyst:`, benchmarkErr);
          bm = await getRoleBenchmarkApi('Statistical Analyst');
          setSelectedRole('Statistical Analyst');
        }
        setBenchmark(bm);

        // Initialize ratings with balanced starting levels (or 50 if unset)
        const initialRatings: Record<string, number> = {};
        fw.domains.forEach((domain) => {
          domain.skills.forEach((skill) => {
            const req = bm.required_levels[skill.name] || 60;
            // Default initial rating to a realistic value slightly below or near the requirement
            initialRatings[skill.name] = Math.max(20, Math.min(95, req - 15));
          });
        });
        setRatings(initialRatings);
      } catch (err: any) {
        console.error('Failed to load framework:', err);
        setErrorMessage('Failed to load competency framework from backend API.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // When role changes, re-fetch benchmark
  const handleRoleChange = async (newRole: string) => {
    setSelectedRole(newRole);
    try {
      const bm = await getRoleBenchmarkApi(newRole);
      setBenchmark(bm);
    } catch (err) {
      console.warn('Could not fetch benchmarks for selected role:', err);
    }
  };

  const handleSliderChange = (skillName: string, value: number) => {
    setRatings((prev) => ({
      ...prev,
      [skillName]: value,
    }));
  };

  const getProficiencyLabel = (val: number) => {
    if (val <= 25) return { label: 'Foundational', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
    if (val <= 50) return { label: 'Working', color: 'text-sky-400 bg-sky-400/10 border-sky-400/20' };
    if (val <= 75) return { label: 'Practitioner', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' };
    return { label: 'Cadre Specialist', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' };
  };

  const handleSubmit = async () => {
    if (!framework) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Build submission payload
      const skillList: { skill_name: string; domain: string; current_level: number }[] = [];

      framework.domains.forEach((d) => {
        d.skills.forEach((s) => {
          skillList.push({
            skill_name: s.name,
            domain: d.name,
            current_level: ratings[s.name] ?? 50,
          });
        });
      });

      const payload: OnboardingPayload = {
        role: selectedRole,
        department: selectedDepartment,
        experience_years: experienceYears,
        skills: skillList,
      };

      await submitOnboardingApi(payload);
      await refreshUser();
      setSuccessMessage('Competency profile recorded successfully! Redirecting to Dashboard...');
      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (err: any) {
      console.error('Submission failed:', err);
      setErrorMessage(err?.response?.data?.detail || 'Failed to submit competency profile.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm font-medium text-slate-400">Loading NSSTA / MoSPI Competency Framework...</p>
        </div>
      </div>
    );
  }

  const activeDomain = framework?.domains[activeDomainIndex];

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        {/* Wizard Progress Stepper */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Competency Profile Builder
                </h1>
                <p className="text-xs text-slate-400">
                  Self-assessment aligned with the NSSTA & Mission Karmayogi Competency Framework
                </p>
              </div>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center space-x-2 text-xs font-semibold">
              <div
                className={`px-3 py-1 rounded-lg border ${
                  step === 1
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                1. Role & Cadre
              </div>
              <span className="text-slate-600">→</span>
              <div
                className={`px-3 py-1 rounded-lg border ${
                  step === 2
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                2. Self-Assessment
              </div>
              <span className="text-slate-600">→</span>
              <div
                className={`px-3 py-1 rounded-lg border ${
                  step === 3
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                3. Final Review
              </div>
            </div>
          </div>
        </div>

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="flex items-center space-x-2 p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="flex items-center space-x-2 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* STEP 1: Role & Department */}
        {step === 1 && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-md space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-blue-400" />
                <span>Step 1: Select Your Cadre & Administrative Department</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Your role determines the expected competency benchmarks established by NSSTA/MoSPI guidelines.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Role */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                  <span>Cadre / Official Role</span>
                </label>
                <div className="space-y-2">
                  {ROLES.map((r) => (
                    <div
                      key={r}
                      onClick={() => handleRoleChange(r)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedRole === r
                          ? 'bg-blue-600/10 border-blue-500 text-white shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <span className="text-xs font-semibold">{r}</span>
                      {selectedRole === r && (
                        <CheckCircle2 className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Department & Experience */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <Building className="w-3.5 h-3.5 text-blue-400" />
                    <span>Administrative Department</span>
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-slate-300 flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Years in Public Service / Statistics</span>
                    </label>
                    <span className="text-blue-400 font-bold">{experienceYears} Years</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="35"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(parseInt(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Junior / Induction (0-2y)</span>
                    <span>Mid-Career (10-15y)</span>
                    <span>Senior Directorate (25y+)</span>
                  </div>
                </div>

                {/* Benchmark Snapshot */}
                {benchmark && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Framework Target Cadre:</span>
                      <span className="text-amber-400 font-semibold">{benchmark.cadre}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Loading required benchmarks for <strong>20 sub-skills</strong> across 4 domains.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!selectedRole || !selectedDepartment}
                className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs transition-all flex items-center space-x-2 shadow-lg shadow-blue-500/20"
              >
                <span>Proceed to Self-Assessment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Competency Sliders Grouped by 4 Domains */}
        {step === 2 && framework && (
          <div className="space-y-6">
            {/* Domain Tabs Navigation */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {framework.domains.map((dom, idx) => (
                <button
                  key={dom.id}
                  onClick={() => setActiveDomainIndex(idx)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    activeDomainIndex === idx
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/10'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                    Domain {idx + 1}
                  </div>
                  <div className="text-xs font-bold mt-0.5">{dom.name}</div>
                  <div className="text-[10px] mt-1 opacity-70">
                    {dom.skills.length} Sub-skills
                  </div>
                </button>
              ))}
            </div>

            {/* Active Domain Panel */}
            {activeDomain && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-md space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center space-x-2">
                      <BarChart2 className="w-4 h-4 text-blue-400" />
                      <span>{activeDomain.name} Competencies</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">{activeDomain.description}</p>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
                    Target Role: {selectedRole}
                  </span>
                </div>

                {/* Sub-skill sliders */}
                <div className="space-y-6">
                  {activeDomain.skills.map((skill) => {
                    const currentVal = ratings[skill.name] ?? 50;
                    const requiredVal = benchmark?.required_levels[skill.name] ?? 60;
                    const delta = currentVal - requiredVal;
                    const badge = getProficiencyLabel(currentVal);

                    return (
                      <div
                        key={skill.name}
                        className="p-4 sm:p-5 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-3 transition-colors hover:border-slate-700"
                      >
                        {/* Title and Badge Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-semibold text-white tracking-tight">
                              {skill.name}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">{skill.description}</p>
                          </div>

                          <div className="flex items-center space-x-2 self-start sm:self-auto">
                            <span
                              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badge.color}`}
                            >
                              {badge.label}
                            </span>
                            <span className="text-base font-bold text-white min-w-[3rem] text-right">
                              {currentVal}/100
                            </span>
                          </div>
                        </div>

                        {/* Slider Control */}
                        <div className="space-y-1.5 pt-1">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={currentVal}
                            onChange={(e) =>
                              handleSliderChange(skill.name, parseInt(e.target.value))
                            }
                            className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
                          />

                          {/* Benchmarks & Delta Row */}
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center space-x-2 text-slate-500">
                              <span>0 (Novice)</span>
                              <span>•</span>
                              <span>100 (Master)</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <span className="text-slate-400">
                                Required Benchmark:{' '}
                                <strong className="text-amber-400">{requiredVal}%</strong>
                              </span>
                              <span>•</span>
                              {delta >= 0 ? (
                                <span className="text-emerald-400 font-semibold flex items-center">
                                  <CheckCircle2 className="w-3 h-3 mr-0.5" />
                                  Meets Cadre Target (+{delta})
                                </span>
                              ) : (
                                <span className="text-rose-400 font-semibold flex items-center">
                                  <AlertCircle className="w-3 h-3 mr-0.5" />
                                  Gap Identified ({delta})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Navigation inside Step 2 */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeDomainIndex > 0) {
                        setActiveDomainIndex((i) => i - 1);
                      } else {
                        setStep(1);
                      }
                    }}
                    className="py-2 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-800 transition-colors flex items-center space-x-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{activeDomainIndex > 0 ? 'Previous Domain' : 'Back to Role'}</span>
                  </button>

                  {activeDomainIndex < framework.domains.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setActiveDomainIndex((i) => i + 1)}
                      className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all flex items-center space-x-2 shadow-lg shadow-blue-500/20"
                    >
                      <span>Next: {framework.domains[activeDomainIndex + 1].name}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs transition-all flex items-center space-x-2 shadow-lg shadow-emerald-500/20"
                    >
                      <span>Review Assessment</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Final Review & Submission */}
        {step === 3 && framework && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span>Step 3: Review Your Competency Profile</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Confirm your self-ratings before saving to your official record.
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                Ready for AI Processing
              </span>
            </div>

            {/* Profile Overview Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">Official Name</span>
                <span className="font-bold text-white text-sm">{user?.name || 'Government Official'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Cadre & Role</span>
                <span className="font-bold text-blue-400 text-sm">{selectedRole}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Department</span>
                <span className="font-bold text-slate-200 text-sm">{selectedDepartment}</span>
              </div>
            </div>

            {/* Domain Averages Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {framework.domains.map((dom) => {
                let sum = 0;
                let reqSum = 0;
                dom.skills.forEach((s) => {
                  sum += ratings[s.name] ?? 50;
                  reqSum += benchmark?.required_levels[s.name] ?? 60;
                });
                const avg = Math.round(sum / dom.skills.length);
                const reqAvg = Math.round(reqSum / dom.skills.length);

                return (
                  <div
                    key={dom.id}
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2"
                  >
                    <span className="text-xs font-bold text-slate-300 block">{dom.name}</span>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-black text-white">{avg}%</span>
                      <span className="text-xs text-slate-500">avg proficiency</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          avg >= reqAvg ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                        style={{ width: `${avg}%` }}
                      ></div>
                    </div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>Cadre Target:</span>
                      <span className="font-semibold text-amber-400">{reqAvg}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={isSubmitting}
                className="py-2 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-800 transition-colors flex items-center space-x-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Adjust Ratings</span>
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="py-3 px-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-blue-500/30 flex items-center space-x-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Profile to PostgreSQL...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Finalize Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Full-Page Submission Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl text-white animate-pulse">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-white">Saving Official Competency Profile...</h2>
          <p className="text-xs text-slate-400">Synthesizing cadre benchmarks & computing radar intelligence</p>
        </div>
      )}
    </div>
  );
};
