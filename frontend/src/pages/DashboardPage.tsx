import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import {
  getSkillGapApi,
  getRecommendationsApi,
  enrollCourseApi,
} from '../services/api';
import type {
  SkillGapResponse,
  SkillGapStatus,
  SkillGapItem,
  RecommendationItem,
} from '../types';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import {
  Building,
  Clock,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Filter,
  ShieldCheck,
  Target,
  ChevronRight,
  Info,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Brain,
  X,
  RotateCcw,
  Layers,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  // Skill-gap data & loading
  const [skillGapData, setSkillGapData] = useState<SkillGapResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal state for interactive skill inspection
  const [selectedSkillDetail, setSelectedSkillDetail] = useState<SkillGapItem | null>(null);

  // Centerpiece radar series visibility toggles
  const [showCurrentSeries, setShowCurrentSeries] = useState<boolean>(true);
  const [showRequiredSeries, setShowRequiredSeries] = useState<boolean>(true);

  // Recommendations data & enrollment loading
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loadingRecs, setLoadingRecs] = useState<boolean>(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  // Recommendations filters & sort
  const [recFilter, setRecFilter] = useState<'all' | 'iGOT' | 'NSSTA' | 'enrolled'>('all');
  const [recDomainFilter, setRecDomainFilter] = useState<string>('All');
  const [recSortBy, setRecSortBy] = useState<'gap_desc' | 'duration_asc' | 'duration_desc' | 'title'>('gap_desc');

  // Filter for the centerpiece radar chart: 'All' | domain name
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('All');
  const [showAllSkillsTable, setShowAllSkillsTable] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    if (!user?.id) return;
    setLoading(true);
    setLoadingRecs(true);
    setError(null);
    try {
      // 1. Fetch skill gap calculation from /skill-gap/{user_id}
      const gapData = await getSkillGapApi(user.id);
      setSkillGapData(gapData);

      // 2. Fetch explainable recommendations from /recommendations/{user_id}
      try {
        const recData = await getRecommendationsApi(user.id);
        setRecommendations(recData.recommendations || []);
      } catch (recErr) {
        console.warn('Failed to load course recommendations:', recErr);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard analysis:', err);
      setError(err?.response?.data?.detail || 'Failed to calculate skill gap.');
    } finally {
      setLoading(false);
      setLoadingRecs(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id]);

  // Handle Mock Course Enrollment with Optimistic Update + Rollback
  const handleEnroll = async (courseId: string) => {
    setEnrollingId(courseId);
    setEnrollError(null);
    setEnrollSuccess(null);

    // Save previous state for rollback
    const previousRecs = [...recommendations];

    // Optimistic UI update
    setRecommendations((prev) =>
      prev.map((item) =>
        item.id === courseId ? { ...item, is_enrolled: true } : item
      )
    );

    try {
      await enrollCourseApi(courseId);
      setEnrollSuccess('Enrolled successfully! Course added to your active iGOT/NSSTA curriculum.');
      setTimeout(() => setEnrollSuccess(null), 3500);
    } catch (err: any) {
      console.error('Failed to enroll in course:', err);
      // Rollback on failure
      setRecommendations(previousRecs);
      setEnrollError(err?.response?.data?.detail || 'Enrollment failed. Network error. Reverted status.');
      setTimeout(() => setEnrollError(null), 5000);
    } finally {
      setEnrollingId(null);
    }
  };

  // Filter skills for radar chart based on domain selection
  const filteredSkillsForRadar = useMemo(() => {
    if (!skillGapData) return [];
    if (selectedDomainFilter === 'All') {
      return skillGapData.skills.map((s) => ({
        subject: s.skill.length > 22 ? `${s.skill.substring(0, 20)}...` : s.skill,
        fullSkillName: s.skill,
        domain: s.domain,
        Current: s.current,
        Required: s.required,
        gap: s.gap,
        status: s.status,
        fullMark: 100,
      }));
    }
    return skillGapData.skills
      .filter((s) => s.domain === selectedDomainFilter)
      .map((s) => ({
        subject: s.skill,
        fullSkillName: s.skill,
        domain: s.domain,
        Current: s.current,
        Required: s.required,
        gap: s.gap,
        status: s.status,
        fullMark: 100,
      }));
  }, [skillGapData, selectedDomainFilter]);

  // Enhanced filter and sort for recommendations
  const filteredRecommendations = useMemo(() => {
    let result = [...recommendations];

    // 1. Source filter
    if (recFilter === 'iGOT') {
      result = result.filter((r) => r.source === 'iGOT');
    } else if (recFilter === 'NSSTA') {
      result = result.filter((r) => r.source === 'NSSTA');
    } else if (recFilter === 'enrolled') {
      result = result.filter((r) => r.is_enrolled);
    }

    // 2. Domain filter
    if (recDomainFilter !== 'All') {
      result = result.filter((r) => r.domain === recDomainFilter);
    }

    // 3. Sorting
    if (recSortBy === 'duration_asc') {
      result.sort((a, b) => a.duration_hours - b.duration_hours);
    } else if (recSortBy === 'duration_desc') {
      result.sort((a, b) => b.duration_hours - a.duration_hours);
    } else if (recSortBy === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }
    // gap_desc preserves initial prioritized matching

    return result;
  }, [recommendations, recFilter, recDomainFilter, recSortBy]);

  const hasActiveRecFilters = recFilter !== 'all' || recDomainFilter !== 'All' || recSortBy !== 'gap_desc';

  const clearRecFilters = () => {
    setRecFilter('all');
    setRecDomainFilter('All');
    setRecSortBy('gap_desc');
  };

  // Status badge helper
  const getStatusBadge = (status: SkillGapStatus) => {
    switch (status) {
      case 'priority':
        return {
          label: 'Priority Gap',
          badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          dotClass: 'bg-rose-500',
        };
      case 'moderate':
        return {
          label: 'Moderate Gap',
          badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dotClass: 'bg-amber-400',
        };
      case 'on track':
      default:
        return {
          label: 'On Track',
          badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dotClass: 'bg-emerald-400',
        };
    }
  };

  // Custom Radar Tooltip
  const CustomRadarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const statusInfo = getStatusBadge(data.status);
      return (
        <div className="p-3 bg-slate-950 border border-slate-700 rounded-xl shadow-xl text-xs space-y-1.5 max-w-xs z-50">
          <p className="font-bold text-white text-sm">{data.fullSkillName}</p>
          <p className="text-[10px] text-slate-400 font-medium uppercase">{data.domain}</p>
          <div className="pt-1 border-t border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-slate-300">
              <span>Current Official Level:</span>
              <span className="font-bold text-sky-400">{data.Current}/100</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Cadre Required Benchmark:</span>
              <span className="font-bold text-amber-400">{data.Required}/100</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
              <span>Skill Gap:</span>
              <span
                className={`font-extrabold ${
                  data.gap > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {data.gap > 0 ? `-${data.gap} pts` : `+${Math.abs(data.gap)} pts over req`}
              </span>
            </div>
            <div className="pt-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${statusInfo.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass} mr-1.5`}></span>
                {statusInfo.label}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const domainsList = ['All', 'Statistical', 'Technical', 'Digital Governance', 'Behavioural'];

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        {/* ========================================================================= */}
        {/* 1. HEADER: Welcome {role} + Overall Competency % + Overall Gap %          */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left Greeting & Meta */}
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>StatSkill AI • Learner Intelligence Engine</span>
              </div>

              {/* Requirement: Header: "Welcome, {role}" */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Welcome, {user?.role || 'Statistical Analyst'}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400 pt-1">
                <span className="font-semibold text-slate-200">{user?.name}</span>
                <span>•</span>
                <span className="flex items-center space-x-1.5 text-slate-300">
                  <Building className="w-3.5 h-3.5 text-blue-400" />
                  <span>{user?.department || 'Ministry of Statistics & PI'}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1.5 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{user?.experience_years ?? 3} Years Experience</span>
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-medium flex items-center">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  NSSTA Framework Aligned
                </span>
              </div>

              <div className="pt-2">
                <Link
                  to="/quiz"
                  className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition"
                >
                  <Brain className="w-3.5 h-3.5 text-white" />
                  <span>Generate AI Quiz from PDF (RAG)</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Right Metric Gauges: overall_competency_pct & overall_gap_pct */}
            <div className="flex items-center gap-4 sm:gap-6 self-start lg:self-auto">
              {/* Overall Competency Metric */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-blue-500/30 shadow-lg shadow-blue-500/10 flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <Target className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Overall Competency
                  </span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-3xl font-black text-white tracking-tight">
                      {skillGapData ? `${skillGapData.overall_competency_pct}%` : '--'}
                    </span>
                    <span className="text-[11px] font-medium text-emerald-400">of cadre benchmark</span>
                  </div>
                </div>
              </div>

              {/* Overall Capability Gap Metric */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-rose-500/30 shadow-lg shadow-rose-500/10 flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 to-amber-600 flex items-center justify-center text-white shadow-md">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Overall Capability Gap
                  </span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-3xl font-black text-rose-400 tracking-tight">
                      {skillGapData ? `${skillGapData.overall_gap_pct}%` : '--'}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">to close</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-sm font-medium text-slate-400">
              Running Skill-Gap Engine & matching iGOT course pathways...
            </p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-sm flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : skillGapData ? (
          <>
            {/* ========================================================================= */}
            {/* 2. CENTERPIECE RADAR DASHBOARD + PRIORITY SKILLS GRID                     */}
            {/* ========================================================================= */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* RADAR CHART CENTERPIECE (8 Cols) */}
              <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-md flex flex-col justify-between shadow-2xl relative">
                {/* Centerpiece Badge & Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5 text-sky-400" />
                        <span>Statistical Competency Radar</span>
                      </h2>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        Visual Centerpiece
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Two overlapping polygons comparing your current proficiencies vs. NSSTA cadre benchmarks
                    </p>
                  </div>

                  {/* Domain Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    {domainsList.map((dom) => (
                      <button
                        key={dom}
                        onClick={() => setSelectedDomainFilter(dom)}
                        className={`px-3 py-1 rounded-lg font-medium transition-all ${
                          selectedDomainFilter === dom
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {dom}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Series Visibility Toggles */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span>Display Series:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCurrentSeries(!showCurrentSeries)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                      showCurrentSeries
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm'
                        : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${showCurrentSeries ? 'bg-sky-400' : 'bg-slate-600'}`} />
                    <span>Official Current Level {showCurrentSeries ? '✓' : '(Hidden)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRequiredSeries(!showRequiredSeries)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                      showRequiredSeries
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                        : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${showRequiredSeries ? 'bg-amber-400' : 'bg-slate-600'}`} />
                    <span>Cadre Benchmark {showRequiredSeries ? '✓' : '(Hidden)'}</span>
                  </button>
                </div>

                {/* Radar Chart Visual Engine */}
                <div className="w-full h-[420px] sm:h-[480px] flex items-center justify-center my-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="78%" data={filteredSkillsForRadar}>
                      <PolarGrid stroke="#334155" strokeDasharray="3 3" />
                      <PolarAngleAxis
                        dataKey="subject"
                        stroke="#94a3b8"
                        tick={{ fontSize: 11, fill: '#cbd5e1' }}
                      />
                      <PolarRadiusAxis
                        angle={45}
                        domain={[0, 100]}
                        stroke="#475569"
                        tick={{ fontSize: 10 }}
                      />

                      {/* Polygon 1: Official Current Proficiency */}
                      {showCurrentSeries && (
                        <Radar
                          name="Current Level (Official)"
                          dataKey="Current"
                          stroke="#38bdf8"
                          strokeWidth={2.5}
                          fill="#38bdf8"
                          fillOpacity={0.4}
                          dot={{ r: 3, fill: '#38bdf8', stroke: '#0284c7' }}
                        />
                      )}

                      {/* Polygon 2: Cadre Required Benchmark */}
                      {showRequiredSeries && (
                        <Radar
                          name="Required Benchmark (Cadre)"
                          dataKey="Required"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          strokeDasharray="4 2"
                          fill="#f59e0b"
                          fillOpacity={0.15}
                          dot={{ r: 2.5, fill: '#f59e0b', stroke: '#b45309' }}
                        />
                      )}

                      <Legend
                        wrapperStyle={{
                          fontSize: '12px',
                          paddingTop: '16px',
                        }}
                      />
                      <Tooltip content={<CustomRadarTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Radar Footer Insight */}
                <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
                  <span className="flex items-center space-x-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-400" />
                    <span>
                      Viewing <strong>{filteredSkillsForRadar.length}</strong> competencies under{' '}
                      <strong>{selectedDomainFilter}</strong>. Hover points for full gap analytics.
                    </span>
                  </span>

                  <Link
                    to="/onboarding"
                    className="text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
                  >
                    <span>Re-calibrate Ratings</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 3. PRIORITY SKILLS (TOP 3 BY GAP SIZE) (4 Cols)                           */}
              {/* ========================================================================= */}
              <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-7 backdrop-blur-md flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="border-b border-slate-800 pb-4">
                    <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Priority Skills (Top 3 Gaps)</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Highest capability deficits relative to your cadre benchmark. Immediate intervention targets.
                    </p>
                  </div>

                  {/* Priority Skills Cards */}
                  <div className="space-y-3.5">
                    {skillGapData.priority_skills.slice(0, 3).map((item, index) => {
                      const badgeInfo = getStatusBadge(item.status);
                      return (
                        <div
                          key={item.skill}
                          onClick={() => setSelectedSkillDetail(item)}
                          className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-blue-500/60 hover:bg-slate-900/90 cursor-pointer transition-all space-y-3 group"
                          title="Click to view detailed competency breakdown & AI practice"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                #{index + 1} • {item.domain}
                              </span>
                              <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors leading-tight">
                                {item.skill}
                              </h4>
                            </div>

                            {/* Color-coded badge (red for priority, yellow for moderate, green for on track) */}
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${badgeInfo.badgeClass}`}
                            >
                              {badgeInfo.label}
                            </span>
                          </div>

                          {/* Level comparison & gap delta */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-slate-400">
                                Level: <strong className="text-sky-400">{item.current}%</strong> /{' '}
                                <strong className="text-amber-400">{item.required}%</strong>
                              </span>
                              <span className="text-rose-400 font-bold">-{item.gap} pts gap</span>
                            </div>

                            {/* Visual Progress Bar comparing Current vs Required */}
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden relative">
                              <div
                                className="bg-sky-400 h-full rounded-full absolute left-0 top-0"
                                style={{ width: `${item.current}%` }}
                              ></div>
                              <div
                                className="w-1 h-full bg-amber-400 absolute top-0"
                                style={{ left: `${item.required}%` }}
                                title={`Cadre Benchmark: ${item.required}%`}
                              ></div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 group-hover:text-sky-300 pt-1 border-t border-slate-800/60 transition-colors">
                            <span>Inspect Diagnostic & Practice</span>
                            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Action CTA linking to Recommendations */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-950/50 to-indigo-950/50 border border-blue-500/20 space-y-2">
                  <span className="text-xs font-bold text-blue-300 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>Explainable iGOT Pathways Ready</span>
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Courses matched below specifically target your top {skillGapData.priority_skills.length} capability deficits.
                  </p>
                  <a
                    href="#recommended-learning"
                    className="w-full mt-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
                  >
                    <span>View Recommended Courses</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </section>

            {/* ========================================================================= */}
            {/* 3. RECOMMENDED LEARNING SECTION (iGOT & NSSTA MOCK INTEGRATION) - PHASE 3 */}
            {/* ========================================================================= */}
            <section id="recommended-learning" className="space-y-6 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="w-5 h-5 text-amber-400" />
                    <h2 className="text-xl font-extrabold text-white tracking-tight">
                      Recommended Learning (iGOT & NSSTA Integration)
                    </h2>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      Explainable AI
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Curriculum mapped dynamically to your highest statistical skill deficits using the NSSTA & Mission Karmayogi catalog
                  </p>
                </div>

                {/* Filter and Sort controls */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {/* Source Tabs */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setRecFilter('all')}
                      className={`px-3 py-1 rounded-lg font-medium transition-all ${
                        recFilter === 'all'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({recommendations.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecFilter('iGOT')}
                      className={`px-3 py-1 rounded-lg font-medium transition-all ${
                        recFilter === 'iGOT'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      iGOT
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecFilter('NSSTA')}
                      className={`px-3 py-1 rounded-lg font-medium transition-all ${
                        recFilter === 'NSSTA'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      NSSTA
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecFilter('enrolled')}
                      className={`px-3 py-1 rounded-lg font-medium transition-all ${
                        recFilter === 'enrolled'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Enrolled ({recommendations.filter((r) => r.is_enrolled).length})
                    </button>
                  </div>

                  {/* Domain Selector */}
                  <select
                    value={recDomainFilter}
                    onChange={(e) => setRecDomainFilter(e.target.value)}
                    className="py-1.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="All">All Domains</option>
                    <option value="Statistical">Statistical</option>
                    <option value="Technical">Technical</option>
                    <option value="Digital Governance">Digital Governance</option>
                    <option value="Behavioural">Behavioural</option>
                  </select>

                  {/* Sort Selector */}
                  <select
                    value={recSortBy}
                    onChange={(e) => setRecSortBy(e.target.value as any)}
                    className="py-1.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="gap_desc">Sort: Priority Deficit</option>
                    <option value="duration_asc">Duration: Shortest First</option>
                    <option value="duration_desc">Duration: Longest First</option>
                    <option value="title">Course Title (A-Z)</option>
                  </select>

                  {/* Clear Filters Button */}
                  {hasActiveRecFilters && (
                    <button
                      type="button"
                      onClick={clearRecFilters}
                      className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold flex items-center gap-1 transition"
                      title="Reset all course filters"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Clear Filters</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Enrollment Feedback Notifications */}
              {enrollSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{enrollSuccess}</span>
                </div>
              )}
              {enrollError && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{enrollError}</span>
                </div>
              )}

              {loadingRecs ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                  <p className="text-xs text-slate-400">Synthesizing explainable course recommendations...</p>
                </div>
              ) : filteredRecommendations.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                  <BookOpen className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-sm font-semibold text-white">No courses match this filter.</p>
                  <p className="text-xs text-slate-400">
                    Switch to "All" to view all explainable recommendations mapped to your profile.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRecommendations.map((course) => {
                    const isNSSTA = course.source === 'NSSTA';
                    return (
                      <div
                        key={course.id}
                        className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all shadow-xl group"
                      >
                        {/* Course Card Top: Badges */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            {/* Source Badge */}
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                isNSSTA
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              }`}
                            >
                              {course.source} {isNSSTA ? 'Academy' : 'Karmayogi'}
                            </span>

                            <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-medium">
                              <span className="flex items-center">
                                <Clock className="w-3 h-3 mr-1 text-slate-500" />
                                {course.duration_hours}h
                              </span>
                              <span>•</span>
                              <span className="text-slate-300">{course.level}</span>
                            </div>
                          </div>

                          {/* Course Title & Domain */}
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              {course.domain} • {course.skill_tag}
                            </span>
                            <h3 className="text-base font-bold text-white mt-1 group-hover:text-sky-300 transition-colors leading-snug">
                              {course.title}
                            </h3>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {course.description}
                          </p>
                        </div>

                        {/* ================================================================= */}
                        {/* EXPLAINABILITY BANNER (KEY EVALUATOR FEATURE FOR SIH PS 26101)     */}
                        {/* ================================================================= */}
                        <div className="space-y-4 pt-2">
                          <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/60 via-slate-950 to-indigo-950/60 border border-blue-500/30 shadow-inner space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1.5 text-[11px] font-bold text-sky-400">
                                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                                <span>AI Recommendation Rationale:</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setExpandedCourseId(expandedCourseId === course.id ? null : course.id)}
                                className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold sm:hidden flex items-center gap-0.5 p-0.5"
                                title="Tap to toggle full explanation"
                              >
                                <Info className="w-3 h-3" />
                                <span>{expandedCourseId === course.id ? 'Collapse' : 'Explain'}</span>
                              </button>
                            </div>
                            <p className={`text-xs text-slate-200 leading-snug font-medium italic ${
                              expandedCourseId === course.id ? 'block' : 'line-clamp-2 sm:line-clamp-none'
                            }`}>
                              "{course.explanation}"
                            </p>
                          </div>

                          {/* Action Button: Mock Enroll */}
                          <div className="pt-1">
                            {course.is_enrolled ? (
                              <button
                                disabled
                                className="w-full py-2.5 px-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-bold text-xs flex items-center justify-center space-x-2 cursor-default"
                              >
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>Enrolled on Portal ✓</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEnroll(course.id)}
                                disabled={enrollingId === course.id}
                                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                              >
                                {enrollingId === course.id ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Enrolling...</span>
                                  </>
                                ) : (
                                  <>
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>Enroll via {course.source}</span>
                                    <ExternalLink className="w-3 h-3 ml-1 opacity-70" />
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ========================================================================= */}
            {/* 4. DOMAIN SUMMARY CARDS & PROGRESS METRICS                                */}
            {/* ========================================================================= */}
            <section className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Competency Domain Diagnostic</h3>
                  <p className="text-xs text-slate-400">
                    Aggregated proficiency & cadre gap across the 4 primary pillars
                  </p>
                </div>

                <button
                  onClick={() => setShowAllSkillsTable((v) => !v)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Filter className="w-3 h-3" />
                  <span>{showAllSkillsTable ? 'Hide Complete Inventory' : 'View All 20 Skills'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {skillGapData.domain_breakdown.map((dom) => {
                  const isPositive = dom.avg_gap <= 0;
                  return (
                    <div
                      key={dom.domain}
                      className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{dom.domain}</span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            isPositive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : dom.avg_gap > 20
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {isPositive ? 'Surplus' : `-${dom.avg_gap} pts gap`}
                        </span>
                      </div>

                      <div className="flex items-baseline space-x-2">
                        <span className="text-3xl font-extrabold text-white">{dom.avg_current}%</span>
                        <span className="text-xs text-slate-500">avg level</span>
                      </div>

                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isPositive ? 'bg-emerald-500' : 'bg-sky-500'
                          }`}
                          style={{ width: `${dom.avg_current}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Cadre Benchmark:</span>
                        <strong className="text-amber-400">{dom.avg_required}%</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ========================================================================= */}
            {/* 5. ALL SKILLS TABLE (Expandable / Toggleable)                             */}
            {/* ========================================================================= */}
            {showAllSkillsTable && (
              <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white">
                    Complete Statistical Competency Inventory ({skillGapData.skills.length} Skills)
                  </h3>
                  <span className="text-xs text-slate-400">Sorted by Gap Size (Descending)</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                        <th className="py-2.5 px-3">Competency Sub-skill</th>
                        <th className="py-2.5 px-3">Domain</th>
                        <th className="py-2.5 px-3 text-center">Current Level</th>
                        <th className="py-2.5 px-3 text-center">Cadre Required</th>
                        <th className="py-2.5 px-3 text-center">Gap Delta</th>
                        <th className="py-2.5 px-3 text-right">Status Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {skillGapData.skills.map((item) => {
                        const statusBadge = getStatusBadge(item.status);
                        return (
                          <tr
                            key={item.skill}
                            onClick={() => setSelectedSkillDetail(item)}
                            className="hover:bg-slate-800/60 cursor-pointer transition-colors group"
                            title="Click to inspect competency diagnostics & practice with AI"
                          >
                            <td className="py-3 px-3 font-medium text-white group-hover:text-sky-300 transition-colors">
                              {item.skill}
                            </td>
                            <td className="py-3 px-3 text-slate-400">{item.domain}</td>
                            <td className="py-3 px-3 text-center font-bold text-sky-400">
                              {item.current}%
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-amber-400">
                              {item.required}%
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`font-bold ${
                                  item.gap > 0 ? 'text-rose-400' : 'text-emerald-400'
                                }`}
                              >
                                {item.gap > 0 ? `-${item.gap}` : `+${Math.abs(item.gap)}`}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${statusBadge.badgeClass}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotClass} mr-1`}
                                ></span>
                                {statusBadge.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        ) : null}
      </main>

      {/* Priority Skill Diagnostic & Practice Modal */}
      {selectedSkillDetail && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedSkillDetail(null)}
        >
          <div
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {selectedSkillDetail.domain} Competency
                  </span>
                  <h3 className="text-base font-bold text-white">{selectedSkillDetail.skill}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSkillDetail(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Level Comparison Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">Cadre Benchmark Alignment</span>
                  <span className={`font-bold px-2.5 py-0.5 rounded-full border text-[10px] ${getStatusBadge(selectedSkillDetail.status).badgeClass}`}>
                    {getStatusBadge(selectedSkillDetail.status).label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Current Official Level</span>
                    <span className="text-xl font-black text-sky-400">{selectedSkillDetail.current}%</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Cadre Required Benchmark</span>
                    <span className="text-xl font-black text-amber-400">{selectedSkillDetail.required}%</span>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Capability Deficit to Target</span>
                    <span className={`font-bold ${selectedSkillDetail.gap > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {selectedSkillDetail.gap > 0 ? `-${selectedSkillDetail.gap} pts gap` : `+${Math.abs(selectedSkillDetail.gap)} pts surplus`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden relative">
                    <div className="bg-sky-400 h-full rounded-full" style={{ width: `${selectedSkillDetail.current}%` }} />
                    <div className="w-1 h-full bg-amber-400 absolute top-0" style={{ left: `${selectedSkillDetail.required}%` }} />
                  </div>
                </div>
              </div>

              {/* Action CTAs */}
              <div className="space-y-2.5">
                <Link
                  to={`/quiz?skill=${encodeURIComponent(selectedSkillDetail.skill)}`}
                  onClick={() => setSelectedSkillDetail(null)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition"
                >
                  <Brain className="w-4 h-4 text-white" />
                  <span>Generate AI Quiz on this Skill</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    const targetDomain = selectedSkillDetail.domain;
                    setSelectedSkillDetail(null);
                    setRecDomainFilter(targetDomain);
                    const recSec = document.getElementById('recommended-learning');
                    if (recSec) recSec.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 transition"
                >
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>Filter Recommended Courses ({selectedSkillDetail.domain})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
