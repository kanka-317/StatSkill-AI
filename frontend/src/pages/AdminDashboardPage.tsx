import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Target,
  AlertTriangle,
  BookOpen,
  Shield,
  ShieldCheck,
  RefreshCw,
  Building2,
  Brain,
  GraduationCap,
  Sparkles,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { getAdminAnalyticsApi, toggleAdminRoleApi } from '../services/api';
import type { AdminAnalyticsResponse } from '../types';

export const AdminDashboardPage: React.FC = () => {
  const { user, updateUserState } = useAuth();

  const [analytics, setAnalytics] = useState<AdminAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingRole, setTogglingRole] = useState<boolean>(false);
  const [showRoleConfirmModal, setShowRoleConfirmModal] = useState<boolean>(false);
  const [roleToggleError, setRoleToggleError] = useState<string | null>(null);

  // Filters and Sorting
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [courseSortField, setCourseSortField] = useState<'title' | 'source' | 'domain' | 'enrollment_count'>('enrollment_count');
  const [courseSortOrder, setCourseSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAllCourses, setShowAllCourses] = useState<boolean>(false);

  const isAdmin = user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadAnalytics();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminAnalyticsApi();
      setAnalytics(data);
    } catch (err: any) {
      console.error('Failed to load admin analytics:', err);
      setError(err.response?.data?.detail || 'Failed to load organizational analytics.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdminRole = async () => {
    try {
      setTogglingRole(true);
      setRoleToggleError(null);
      const res = await toggleAdminRoleApi();
      if (user) {
        updateUserState({ ...user, role: res.current_role });
      }
      setShowRoleConfirmModal(false);
      if (res.is_admin) {
        await loadAnalytics();
      }
    } catch (err: any) {
      console.error('Role toggle failed:', err);
      setRoleToggleError(err?.response?.data?.detail || 'Could not toggle role. Please check network connection.');
    } finally {
      setTogglingRole(false);
    }
  };

  // Unique departments for filter dropdown
  const departmentOptions = useMemo(() => {
    if (!analytics?.department_gaps) return [];
    return Array.from(new Set(analytics.department_gaps.map((d) => d.department)));
  }, [analytics]);

  // Filtered department gaps for bar chart
  const filteredDepartmentGaps = useMemo(() => {
    if (!analytics?.department_gaps) return [];
    return analytics.department_gaps.filter((d) => {
      if (selectedDepartment !== 'ALL' && d.department !== selectedDepartment) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return d.department.toLowerCase().includes(q);
      }
      return true;
    });
  }, [analytics, selectedDepartment, searchQuery]);

  // Filtered and sorted course enrollments
  const filteredAndSortedCourses = useMemo(() => {
    if (!analytics?.course_enrollments) return [];
    const list = analytics.course_enrollments.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.domain.toLowerCase().includes(q) ||
          c.source.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return list.sort((a, b) => {
      let comparison = 0;
      if (courseSortField === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (courseSortField === 'source') {
        comparison = a.source.localeCompare(b.source);
      } else if (courseSortField === 'domain') {
        comparison = a.domain.localeCompare(b.domain);
      } else if (courseSortField === 'enrollment_count') {
        comparison = a.enrollment_count - b.enrollment_count;
      }
      return courseSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [analytics, searchQuery, courseSortField, courseSortOrder]);

  const toggleSort = (field: 'title' | 'source' | 'domain' | 'enrollment_count') => {
    if (courseSortField === field) {
      setCourseSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setCourseSortField(field);
      setCourseSortOrder('desc');
    }
  };

  // Custom Tooltip for Department Gap Bar Chart
  const DepartmentTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl text-xs space-y-1">
          <p className="font-bold text-white text-sm">{data.department}</p>
          <div className="pt-1 border-t border-slate-800 space-y-1">
            <div className="flex justify-between gap-4 text-slate-300">
              <span>Registered Officials:</span>
              <span className="font-bold text-white">{data.official_count}</span>
            </div>
            <div className="flex justify-between gap-4 text-slate-300">
              <span>Average Capability Deficit:</span>
              <span className="font-bold text-rose-400">{data.avg_gap} pts</span>
            </div>
            <div className="flex justify-between gap-4 text-slate-300">
              <span>Average Target Competency:</span>
              <span className="font-bold text-sky-400">{data.avg_competency}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Predictive Training Demand Bar Chart
  const DemandTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl text-xs space-y-1">
          <p className="font-bold text-white text-sm">{data.skill_name}</p>
          <p className="text-[10px] text-slate-400 font-semibold uppercase">{data.domain} Domain</p>
          <div className="pt-1 border-t border-slate-800 space-y-1">
            <div className="flex justify-between gap-4 text-slate-300">
              <span>Average Cadre Deficit:</span>
              <span className="font-bold text-rose-400">{data.avg_gap} pts</span>
            </div>
            <div className="flex justify-between gap-4 text-slate-300">
              <span>Officials Needing Training:</span>
              <span className="font-bold text-amber-300">{data.affected_officials_count}</span>
            </div>
            <div className="flex justify-between gap-4 text-slate-300">
              <span>Training Demand Priority:</span>
              <span
                className={`font-bold ${
                  data.demand_priority === 'Urgent' ? 'text-rose-400' : 'text-amber-400'
                }`}
              >
                {data.demand_priority}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // If user is NOT admin, show evaluator demo switch
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto my-16 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <Shield className="w-8 h-8" />
        </div>

        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
            Role-Guarded Leadership Portal
          </span>
          <h2 className="text-2xl font-extrabold text-white mt-3">
            Administrative Access Required
          </h2>
          <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            The Admin Intelligence view aggregates organizational competency data, department-wise capability deficits, and predictive training demand across all registered officials.
          </p>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 text-xs text-slate-300 text-left space-y-1.5">
          <p className="font-semibold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Hackathon Evaluator Notice:
          </p>
          <p className="text-slate-400">
            You are currently signed in as <span className="font-bold text-white">{user?.name}</span> with role <span className="font-bold text-indigo-300 font-mono">"{user?.role}"</span>. Click below to toggle your role to <span className="font-bold text-emerald-400 font-mono">"admin"</span> for an instant demonstration of the Leadership Analytics Dashboard.
          </p>
        </div>

        {roleToggleError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{roleToggleError}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowRoleConfirmModal(true)}
            disabled={togglingRole}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/25 disabled:opacity-50"
          >
            {togglingRole ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            Switch to Admin Demo Mode (1-Click)
          </button>
          <Link
            to="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Back to Learner Dashboard
          </Link>
        </div>

        {/* Role Toggle Confirmation Modal */}
        {showRoleConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl text-left space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                  <h3 className="text-base font-bold text-white">Switch to Leadership Role</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRoleConfirmModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                This will grant administrative privileges to inspect cross-cadre competency analytics, department capability deficits, and predictive training demand forecasts.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRoleConfirmModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleToggleAdminRole}
                  disabled={togglingRole}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/25 flex items-center gap-1.5"
                >
                  {togglingRole && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Confirm & Switch to Admin
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Leadership Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 border border-slate-800 p-8 shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              Administrative Intelligence & Cadre Analytics
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              MoSPI / NSSTA Leadership Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Cross-departmental competency diagnostic, systemic capability bottleneck tracking, and predictive training demand forecasting for national statistical cadres.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowRoleConfirmModal(true)}
              disabled={togglingRole}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 text-xs font-semibold border border-slate-700 transition"
              title="Toggle back to standard role for evaluator testing"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Role: Admin (Click to Toggle)</span>
            </button>

            <button
              type="button"
              onClick={loadAnalytics}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Analytics</span>
            </button>
          </div>
        </div>
      </div>

      {roleToggleError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{roleToggleError}</span>
          </div>
          <button
            type="button"
            onClick={() => setRoleToggleError(null)}
            className="text-rose-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-sm font-medium text-slate-400">
            Aggregating cadre competency datasets across MoSPI divisions...
          </p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          <p className="font-bold">Error loading analytics</p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            onClick={loadAnalytics}
            className="mt-3 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-semibold transition"
          >
            Retry Loading
          </button>
        </div>
      ) : analytics ? (
        <>
          {/* Top 4 KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. Total Registered Officials */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Registered Officials
                </span>
                <span className="text-2xl font-black text-white tracking-tight">
                  {analytics.total_officials}
                </span>
                <span className="text-[11px] text-slate-500 block">Across MoSPI Cadres</span>
              </div>
            </div>

            {/* 2. Avg Competency Achievement */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Org-Wide Avg Competency
                </span>
                <span className="text-2xl font-black text-white tracking-tight">
                  {analytics.avg_competency_pct}%
                </span>
                <span className="text-[11px] text-emerald-400 block">Of Cadre Target</span>
              </div>
            </div>

            {/* 3. Avg Capability Gap */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Avg Capability Gap
                </span>
                <span className="text-2xl font-black text-rose-400 tracking-tight">
                  {analytics.avg_gap_pct}%
                </span>
                <span className="text-[11px] text-slate-500 block">Org-wide deficit to close</span>
              </div>
            </div>

            {/* 4. Total Mission Karmayogi Enrollments */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Course Enrollments
                </span>
                <span className="text-2xl font-black text-white tracking-tight">
                  {analytics.total_enrollments}
                </span>
                <span className="text-[11px] text-emerald-400 block">iGOT / NSSTA Active</span>
              </div>
            </div>
          </div>

          {/* Department Filter and Search Control Bar */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Filter className="w-4 h-4 text-indigo-400" />
                <span>Filter Division:</span>
              </div>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Divisions ({analytics.department_gaps.length})</option>
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search divisions or courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-8 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {(selectedDepartment !== 'ALL' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDepartment('ALL');
                    setSearchQuery('');
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline whitespace-nowrap"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Two Primary Charts: Department Gaps & Predictive Training Demand */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Chart 1: Department-Wise Average Skill Gap */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-sky-400" />
                    Department-Wise Capability Deficit
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Average skill gap points grouped by administrative division
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                  {filteredDepartmentGaps.length} Divisions Shown
                </span>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={filteredDepartmentGaps}
                    margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                    <XAxis
                      dataKey="department"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      tickFormatter={(val: string) => {
                        const clean = val.replace(/\s*\([^)]*\)/g, '');
                        return clean.length > 16 ? `${clean.substring(0, 14)}...` : clean;
                      }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={10}
                      domain={[0, 60]}
                      tickLine={false}
                    />
                    <Tooltip content={<DepartmentTooltip />} />
                    <Bar dataKey="avg_gap" radius={[6, 6, 0, 0]}>
                      {filteredDepartmentGaps.map((entry, index) => (
                        <Cell
                          key={`dept-cell-${index}`}
                          fill={
                            entry.avg_gap >= 30
                              ? '#f43f5e'
                              : entry.avg_gap >= 20
                              ? '#f59e0b'
                              : '#38bdf8'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Higher bars indicate urgent need for cadre upskilling</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> &gt;30 pts (Urgent)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> 20-30 pts
                  </span>
                </div>
              </div>
            </div>

            {/* Chart 2: Predictive Training Demand (Top 5 Systemic Skill Gaps) */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Brain className="w-4 h-4 text-rose-400" />
                    Predictive Training Demand (Top 5 Systemic Gaps)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Forecasts organizational training needs for NSSTA Academy course planning
                  </p>
                </div>
                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">
                  Training Forecast
                </span>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.top_systemic_gaps}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 25, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                    <XAxis
                      type="number"
                      domain={[0, 60]}
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="skill_name"
                      type="category"
                      stroke="#cbd5e1"
                      fontSize={10}
                      tickLine={false}
                      width={120}
                      tickFormatter={(val: string) =>
                        val.length > 18 ? `${val.substring(0, 16)}...` : val
                      }
                    />
                    <Tooltip content={<DemandTooltip />} />
                    <Bar dataKey="avg_gap" radius={[0, 6, 6, 0]}>
                      {analytics.top_systemic_gaps.map((entry, index) => (
                        <Cell
                          key={`demand-cell-${index}`}
                          fill={
                            entry.demand_priority === 'Urgent'
                              ? '#ef4444'
                              : entry.demand_priority === 'High'
                              ? '#f97316'
                              : '#eab308'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Top skills recommended for next quarterly NSSTA calendar</span>
                <span className="font-semibold text-rose-300">
                  {analytics.top_systemic_gaps[0]?.skill_name || 'Statistical Methodology'} (Highest Demand)
                </span>
              </div>
            </div>
          </div>

          {/* Table: Course Enrollment Analytics */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  Course Enrollment Capacity & Uptake
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Track uptake across Mission Karmayogi (iGOT) and NSSTA Academy training modules
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAllCourses((prev) => !prev)}
                  className="text-xs font-semibold px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                >
                  {showAllCourses ? 'Show Top 10' : `Show All (${filteredAndSortedCourses.length})`}
                </button>
                <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
                  {filteredAndSortedCourses.length} Courses Cataloged
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-700">
                  <tr>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-white transition"
                      onClick={() => toggleSort('title')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Course Title</span>
                        {courseSortField === 'title' ? (
                          courseSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-white transition"
                      onClick={() => toggleSort('source')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Platform Source</span>
                        {courseSortField === 'source' ? (
                          courseSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-white transition"
                      onClick={() => toggleSort('domain')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Domain</span>
                        {courseSortField === 'domain' ? (
                          courseSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-right cursor-pointer hover:text-white transition"
                      onClick={() => toggleSort('enrollment_count')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Enrolled Officials</span>
                        {courseSortField === 'enrollment_count' ? (
                          courseSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center">Uptake Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredAndSortedCourses
                    .slice(0, showAllCourses ? filteredAndSortedCourses.length : 10)
                    .map((c) => (
                      <tr key={c.course_id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-100 max-w-sm truncate">
                          {c.title}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              c.source === 'iGOT'
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                            }`}
                          >
                            {c.source === 'iGOT' ? 'iGOT Karmayogi' : 'NSSTA Academy'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-medium">
                          {c.domain}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-white">
                          {c.enrollment_count}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              c.enrollment_count > 0
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {c.enrollment_count > 0 ? 'Active Uptake' : 'Open Capacity'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {/* Role Toggle Confirmation Modal */}
      {showRoleConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400">
                <Shield className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Switch Operational Cadre Role</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRoleConfirmModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              You are currently operating as <span className="font-bold text-white font-mono">{user?.role}</span>.
              Switching roles allows you to test the platform through the perspective of an official learner or back to an administrator.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRoleConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleAdminRole}
                disabled={togglingRole}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/25 flex items-center gap-1.5"
              >
                {togglingRole && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm & Toggle Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
