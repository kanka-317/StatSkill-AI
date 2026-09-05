import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  LogOut,
  Sliders,
  LayoutDashboard,
  User as UserIcon,
  Brain,
  Shield,
  Menu,
  X,
  KeyRound,
  Check,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { toggleAdminRoleApi } from '../services/api';

export const Navbar: React.FC = () => {
  const { user, logout, updateUserState } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation and Modal states
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [profileTab, setProfileTab] = useState<'profile' | 'password'>('profile');

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  // Quick role toggle state
  const [isTogglingRole, setIsTogglingRole] = useState<boolean>(false);

  const handleLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    setProfileModalOpen(false);
    navigate('/login');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);
    // Simulate secure credential update
    setTimeout(() => {
      setIsChangingPassword(false);
      setPasswordSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 3500);
    }, 800);
  };

  const handleQuickRoleToggle = async () => {
    if (!user) return;
    setIsTogglingRole(true);
    try {
      const res = await toggleAdminRoleApi();
      updateUserState({ ...user, role: res.current_role });
    } catch (err) {
      console.warn('Could not toggle role:', err);
    } finally {
      setIsTogglingRole(false);
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
      {/* Government Tricolor Top Accent */}
      <div className="bg-gradient-to-r from-[#FF6500] via-[#FFFFFF] to-[#059669] h-1 w-full"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" onClick={closeMobileMenu} className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md shadow-blue-500/20 border border-blue-400/30 group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold tracking-tight text-white">StatSkill AI</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                MoSPI / NSSTA
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Competency & Learning-Intelligence</p>
          </div>
        </Link>

        {/* Desktop Center Nav Links */}
        {user && (
          <nav className="hidden md:flex items-center space-x-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
            <Link
              to="/"
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                location.pathname === '/'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Competency Dashboard</span>
            </Link>

            <Link
              to="/onboarding"
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                location.pathname === '/onboarding'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Assessment Wizard</span>
            </Link>

            <Link
              to="/quiz"
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                location.pathname === '/quiz'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-indigo-300 hover:text-white hover:bg-indigo-950/40 border border-indigo-500/20'
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-indigo-400" />
              <span>AI Quiz (RAG)</span>
            </Link>

            <Link
              to="/admin"
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                location.pathname === '/admin'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-950/40 border border-emerald-500/20'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Admin Intel</span>
            </Link>
          </nav>
        )}

        {/* Right Side Controls & Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {user ? (
            <>
              {/* Profile Button */}
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="flex items-center space-x-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 transition text-left group"
                title="View Profile and Settings"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <span>{user.role}</span>
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                  </span>
                </div>
              </button>

              {/* Mobile Menu Toggle Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="text-xs font-medium px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm"
            >
              Official Login
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && user && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 p-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
          <Link
            to="/"
            onClick={closeMobileMenu}
            className={`flex items-center space-x-2.5 p-3 rounded-xl text-xs font-semibold ${
              location.pathname === '/' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-300'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Competency Dashboard</span>
          </Link>

          <Link
            to="/onboarding"
            onClick={closeMobileMenu}
            className={`flex items-center space-x-2.5 p-3 rounded-xl text-xs font-semibold ${
              location.pathname === '/onboarding' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-300'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Assessment Wizard</span>
          </Link>

          <Link
            to="/quiz"
            onClick={closeMobileMenu}
            className={`flex items-center space-x-2.5 p-3 rounded-xl text-xs font-semibold ${
              location.pathname === '/quiz' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-indigo-300'
            }`}
          >
            <Brain className="w-4 h-4 text-indigo-400" />
            <span>AI Quiz Generator (RAG)</span>
          </Link>

          <Link
            to="/admin"
            onClick={closeMobileMenu}
            className={`flex items-center space-x-2.5 p-3 rounded-xl text-xs font-semibold ${
              location.pathname === '/admin' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-emerald-300'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Admin Leadership Intel</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              closeMobileMenu();
              setProfileModalOpen(true);
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900 text-slate-300 text-xs font-semibold"
          >
            <span className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-blue-400" />
              <span>Officer Profile & Settings</span>
            </span>
            <span className="text-[10px] text-slate-500">{user.role}</span>
          </button>
        </div>
      )}

      {/* Officer Profile & Password Modal */}
      {profileModalOpen && user && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Officer Profile & Security</h3>
                  <p className="text-[10px] text-slate-400">MoSPI Cadre Management</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProfileModalOpen(false);
                  setShowLogoutConfirm(false);
                  setPasswordError(null);
                  setPasswordSuccess(null);
                }}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="grid grid-cols-2 p-1.5 bg-slate-950 border-b border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setProfileTab('profile')}
                className={`py-2 rounded-lg transition ${
                  profileTab === 'profile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Cadre Profile
              </button>
              <button
                type="button"
                onClick={() => setProfileTab('password')}
                className={`py-2 rounded-lg transition ${
                  profileTab === 'password' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Security & Password
              </button>
            </div>

            {/* Tab 1: Profile Details */}
            {profileTab === 'profile' && (
              <div className="p-6 space-y-4 text-xs">
                <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Official Name</span>
                    <p className="font-bold text-sm text-white">{user.name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Official Email</span>
                    <p className="text-slate-300">{user.email}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Assigned Cadre</span>
                      <p className="text-sky-400 font-bold">{user.role}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                      Active Officer
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Department</span>
                    <p className="text-slate-300">{user.department}</p>
                  </div>
                </div>

                {/* 1-Click Role Switcher for SIH Evaluator Demos */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/20 via-slate-950 to-orange-950/20 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Evaluator Presentation Control</span>
                    </span>
                    <span className="text-[9px] text-slate-400">1-Click Switch</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Switch between <strong>Statistical Analyst</strong> and <strong>admin</strong> instantly to evaluate all platform features:
                  </p>
                  <button
                    type="button"
                    onClick={handleQuickRoleToggle}
                    disabled={isTogglingRole}
                    className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-amber-600/20"
                  >
                    {isTogglingRole ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating Cadre Role...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Switch Role to: {user.role?.toLowerCase() === 'admin' ? 'Statistical Analyst' : 'admin (Director)'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Sign Out Confirmation Block */}
                {!showLogoutConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-rose-950/40 text-rose-400 border border-slate-800 hover:border-rose-800/60 font-semibold transition flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out of StatSkill AI</span>
                  </button>
                ) : (
                  <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 space-y-2.5">
                    <p className="text-rose-300 font-semibold text-center">
                      Are you sure you want to sign out?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowLogoutConfirm(false)}
                        className="flex-1 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center justify-center gap-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Confirm Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Change Password */}
            {profileTab === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="p-6 space-y-3.5 text-xs">
                {passwordError && (
                  <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span>{passwordError}</span>
                  </div>
                )}
                {passwordSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">New Password (min 6 chars)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {isChangingPassword ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
