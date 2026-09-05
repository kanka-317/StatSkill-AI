import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  TrendingUp,
  Brain,
  Award,
  ChevronRight,
  Info,
  Clock,
  Check,
  Zap,
  Languages,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  generateQuizApi,
  submitQuizApi,
  getQuizHistoryApi,
  getMySkillGapApi,
} from '../services/api';
import type {
  QuizPublicView,
  QuizSubmissionResponse,
  QuizHistoryItem,
  SkillGapResponse,
} from '../types';

export const QuizPage: React.FC = () => {
  const { user } = useAuth();

  // Wizard state: 'upload' | 'generating' | 'taking' | 'results'
  const [viewState, setViewState] = useState<'upload' | 'generating' | 'taking' | 'results'>('upload');

  // Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Hindi'>('English');
  const [topicHint, setTopicHint] = useState<string>('');
  const [targetSkill, setTargetSkill] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState<QuizPublicView | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [showUnansweredWarning, setShowUnansweredWarning] = useState<boolean>(false);

  // Results State
  const [quizResults, setQuizResults] = useState<QuizSubmissionResponse | null>(null);

  // User Skills & History State
  const [skillGap, setSkillGap] = useState<SkillGapResponse | null>(null);
  const [quizHistory, setQuizHistory] = useState<QuizHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial data loading
  useEffect(() => {
    loadUserSkillsAndHistory();
    const params = new URLSearchParams(window.location.search);
    const skillParam = params.get('skill');
    if (skillParam) {
      setTargetSkill(decodeURIComponent(skillParam));
    }
  }, []);

  const loadUserSkillsAndHistory = async () => {
    try {
      setHistoryLoading(true);
      const [gapRes, histRes] = await Promise.all([
        getMySkillGapApi().catch(() => null),
        getQuizHistoryApi().catch(() => []),
      ]);
      if (gapRes) {
        setSkillGap(gapRes);
        // Default target skill to top priority deficit if available and not set by URL
        const params = new URLSearchParams(window.location.search);
        const skillParam = params.get('skill');
        if (!skillParam) {
          if (gapRes.priority_skills && gapRes.priority_skills.length > 0) {
            setTargetSkill(gapRes.priority_skills[0].skill);
          } else if (gapRes.skills && gapRes.skills.length > 0) {
            setTargetSkill(gapRes.skills[0].skill);
          }
        }
      }
      if (histRes) {
        setQuizHistory(histRes);
      }
    } catch (err) {
      console.error('Failed to load skills or quiz history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setSelectedFile(file);
        setErrorMessage(null);
      } else {
        setErrorMessage('Please upload an official PDF document (.pdf).');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setSelectedFile(file);
        setErrorMessage(null);
      } else {
        setErrorMessage('Please upload an official PDF document (.pdf).');
      }
    }
  };

  // Create a synthetic sample PDF for immediate demo testing
  const handleLoadSampleManual = () => {
    // Generate a minimal valid PDF blob containing official NSSTA content
    const sampleText = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 285 >>
stream
BT
/F1 12 Tf
50 720 Td
(National Statistical Systems Training Academy - Sampling Methodology Manual) Tj
0 -24 Td
(Stratified random sampling minimizes subgroup estimation variance in NSSO rounds.) Tj
0 -24 Td
(Survey weights are computed as the inverse of inclusion probabilities calibrated for non-response.) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
545
%%EOF`;

    const blob = new Blob([sampleText], { type: 'application/pdf' });
    const file = new File([blob], 'NSSTA_Survey_Sampling_Official_Manual.pdf', { type: 'application/pdf' });
    setSelectedFile(file);
    setTopicHint('Stratified Sampling & Variance Estimation');
    setTargetSkill('Survey Sampling & Methodology');
    setErrorMessage(null);
  };

  // Submit PDF for RAG Quiz Generation
  const handleGenerateQuiz = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select or upload a PDF document first.');
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);
    setViewState('generating');
    setGenerationStep(1);

    // Visual step progression
    const timer1 = setTimeout(() => setGenerationStep(2), 2200);
    const timer2 = setTimeout(() => setGenerationStep(3), 5200);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('num_questions', numQuestions.toString());
      formData.append('language', selectedLanguage);
      if (topicHint) formData.append('topic_hint', topicHint);
      if (targetSkill) formData.append('skill_name', targetSkill);

      const generated = await generateQuizApi(formData);
      clearTimeout(timer1);
      clearTimeout(timer2);

      setActiveQuiz(generated);
      setCurrentQuestionIdx(0);
      setUserAnswers({});
      setViewState('taking');
    } catch (err: any) {
      console.error('Quiz generation failed:', err);
      const detail = err.response?.data?.detail || 'Failed to generate quiz from document. Please try again.';
      setErrorMessage(detail);
      setViewState('upload');
    } finally {
      setIsGenerating(false);
    }
  };

  // Quiz-taking interaction
  const handleSelectOption = (questionId: string, optionKey: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey,
    }));
  };

  // Submit Quiz for Grading & Adaptive Skill Elevation
  const handleSubmitQuiz = async (forceSubmit = false) => {
    if (!activeQuiz) return;
    setSubmitErrorMessage(null);

    // Check if any unanswered questions
    const answeredCount = Object.keys(userAnswers).length;
    if (!forceSubmit && answeredCount < activeQuiz.questions.length) {
      setShowUnansweredWarning(true);
      return;
    }

    setShowUnansweredWarning(false);
    setIsSubmitting(true);
    try {
      const results = await submitQuizApi(activeQuiz.id, userAnswers);
      setQuizResults(results);
      setViewState('results');
      // Refresh history and skill gaps to update state
      loadUserSkillsAndHistory();
    } catch (err: any) {
      console.error('Quiz submission failed:', err);
      setSubmitErrorMessage(err?.response?.data?.detail || 'Failed to submit quiz answers. Please verify your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setActiveQuiz(null);
    setQuizResults(null);
    setUserAnswers({});
    setCurrentQuestionIdx(0);
    setViewState('upload');
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Brain className="w-3.5 h-3.5" />
              RAG-Powered Assessment Pipeline
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              AI Competency Assessment Generator
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Upload official circulars, statistical training manuals, or policy PDFs. StatSkill AI extracts concepts, generates Cadre-aligned MCQs for{' '}
              <span className="text-indigo-300 font-semibold">{user?.role || 'Government Officials'}</span>, and adaptively updates your competency profile.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition"
            >
              <TrendingUp className="w-4 h-4 text-sky-400" />
              View Radar Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* VIEW STATE 1: UPLOAD & CONFIGURATION */}
      {viewState === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Upload Box & Config Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm backdrop-blur-sm">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Upload Training Document / Circular
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Supports official PDF documents up to 25MB. Text is chunked and processed through vector conceptual density filters.
              </p>

              {/* Drag & Drop Area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[220px] ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-500/5 ring-4 ring-indigo-500/10'
                    : selectedFile
                    ? 'border-emerald-500/60 bg-emerald-500/5'
                    : 'border-slate-700 hover:border-slate-600 bg-slate-800/30 hover:bg-slate-800/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {selectedFile ? (
                  <div className="space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
                      <FileText className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-300 max-w-sm truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for AI extraction
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-4"
                      >
                        Change Document
                      </button>
                      <span className="text-slate-600">•</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        <span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-slate-500 mt-1">PDF circulars, training materials, manuals</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sample Document Helper */}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400 bg-slate-800/40 rounded-xl px-4 py-3 border border-slate-800">
                <span className="flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  Testing without a file on hand?
                </span>
                <button
                  type="button"
                  onClick={handleLoadSampleManual}
                  className="font-medium text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Load Sample NSSTA Manual
                </button>
              </div>

              {/* Assessment Configuration Controls */}
              <div className="mt-6 pt-6 border-t border-slate-800 space-y-5">
                <h3 className="text-sm font-semibold text-slate-200">Assessment Parameters</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Target Competency Sub-skill */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Target Competency Skill (Adaptive Target)
                    </label>
                    <select
                      value={targetSkill}
                      onChange={(e) => setTargetSkill(e.target.value)}
                      className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    >
                      {skillGap?.skills && skillGap.skills.length > 0 ? (
                        skillGap.skills.map((s) => (
                          <option key={s.skill} value={s.skill}>
                            {s.skill} ({s.domain}) — Current: {s.current}%
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Survey Sampling & Methodology">Survey Sampling & Methodology (Statistical)</option>
                          <option value="Hypothesis Testing & Statistical Inference">Hypothesis Testing & Statistical Inference</option>
                          <option value="Data Quality Assurance & Validation">Data Quality Assurance & Validation</option>
                          <option value="Python for Official Statistics">Python for Official Statistics</option>
                          <option value="RTI Act & Public Records Management">RTI Act & Public Records Management</option>
                        </>
                      )}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Scores from this quiz will adaptively elevate this competency.
                    </p>
                  </div>

                  {/* Question Count Selector */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Number of Questions
                    </label>
                    <div className="flex items-center gap-2">
                      {[3, 5, 8, 10].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setNumQuestions(count)}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition ${
                            numQuestions === count
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700/80'
                          }`}
                        >
                          {count} MCQs
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      3-5 questions recommended for fast synthesis.
                    </p>
                  </div>
                </div>

                {/* Multilingual Selector (Phase 6) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-400">
                      Assessment Language (भाषा)
                    </label>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      Indic LLM Native (₹0 Cost)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedLanguage('English')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold border transition ${
                        selectedLanguage === 'English'
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/25'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/80 hover:text-white'
                      }`}
                    >
                      <span className="text-sm">🇬🇧</span>
                      <span className="font-bold">English</span>
                      {selectedLanguage === 'English' && <Check className="w-3.5 h-3.5 ml-1 text-white" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedLanguage('Hindi')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold border transition ${
                        selectedLanguage === 'Hindi'
                          ? 'bg-gradient-to-r from-amber-600 to-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/25'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/80 hover:text-white'
                      }`}
                    >
                      <span className="text-sm">🇮🇳</span>
                      <span className="font-bold">हिन्दी (Hindi)</span>
                      {selectedLanguage === 'Hindi' && <Check className="w-3.5 h-3.5 ml-1 text-white" />}
                    </button>
                  </div>
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-2.5 text-[11px] text-slate-400">
                    <Languages className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-200 font-semibold">Future Multilingual Roadmap: </span>
                      Full integration with Digital India <strong>Bhashini & IndicTrans2</strong> for regional cadre languages (Tamil, Telugu, Marathi, Bengali, Kannada) scheduled in upcoming Karmayogi rollouts.
                    </div>
                  </div>
                </div>

                {/* Topic / Chapter Hint */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Specific Focus Topic / Chapter (Optional)
                  </label>
                  <input
                    type="text"
                    value={topicHint}
                    onChange={(e) => setTopicHint(e.target.value)}
                    placeholder="e.g. Stratified vs Cluster Sampling, Standard Error Calculation, CPI Formula"
                    className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Directs the RAG semantic chunk retriever to focus on specific syllabus concepts.
                  </p>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 flex items-start justify-between gap-3 text-rose-300 text-xs">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
                      <div>
                        <p className="font-semibold">Generation Notice</p>
                        <p className="mt-0.5 text-rose-300/90">{errorMessage}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateQuiz}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retry
                    </button>
                  </div>
                )}

                {/* Generate Button */}
                <button
                  type="button"
                  onClick={handleGenerateQuiz}
                  disabled={!selectedFile || isGenerating}
                  className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg ${
                    !selectedFile || isGenerating
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white shadow-indigo-600/25 hover:shadow-indigo-600/40'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  Generate Quiz with AI (RAG Pipeline)
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Assessment History & Priority Deficits */}
          <div className="space-y-6">
            {/* Active Priority Gaps Summary */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  Cadre Priority Deficits
                </h3>
                <span className="text-[10px] text-slate-400">Needs Training</span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Targeting these skills in your quizzes accelerates competency closure:
              </p>

              <div className="space-y-2.5">
                {skillGap?.priority_skills && skillGap.priority_skills.length > 0 ? (
                  skillGap.priority_skills.slice(0, 3).map((item) => (
                    <div
                      key={item.skill}
                      onClick={() => setTargetSkill(item.skill)}
                      className="p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 cursor-pointer transition flex items-center justify-between group"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-200 group-hover:text-white">
                          {item.skill}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Current: {item.current}% • Target: {item.required}%
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        -{item.gap}% Gap
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No priority skill gaps logged.</p>
                )}
              </div>
            </div>

            {/* Past Quizzes History */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  Recent Assessments
                </h3>
                <span className="text-[10px] text-slate-400">{quizHistory.length} Recorded</span>
              </div>

              {historyLoading ? (
                <div className="py-6 text-center text-xs text-slate-500">Loading history...</div>
              ) : quizHistory.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No quizzes completed yet. Upload a document to take your first assessment.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {quizHistory.slice(0, 5).map((q) => (
                    <div
                      key={q.id}
                      className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="max-w-[70%]">
                        <p className="text-xs font-semibold text-slate-200 truncate">{q.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {q.skill_name || 'General Competency'} • {q.language === 'Hindi' ? '🇮🇳 Hindi' : '🇬🇧 English'} • {new Date(q.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            q.score_percentage >= 80
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : q.score_percentage >= 50
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {q.score}/{q.num_questions} ({q.score_percentage}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW STATE 2: GENERATING (AI PIPELINE ANIMATION) */}
      {viewState === 'generating' && (
        <div className="max-w-xl mx-auto my-12 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-xl">
              <Brain className="w-10 h-10 animate-pulse" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-white mb-2">
            RAG Pipeline Processing Document
          </h2>
          <p className="text-xs text-slate-400 mb-8 max-w-md mx-auto">
            Extracting text from <span className="text-indigo-300 font-semibold">{selectedFile?.name}</span> and synthesizing cadre-aligned multiple-choice questions.
          </p>

          <div className="space-y-4 text-left max-w-md mx-auto">
            <div className={`p-3.5 rounded-xl border flex items-center gap-3 transition ${
              generationStep >= 1 ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-slate-800/30 border-slate-800 text-slate-500'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                generationStep > 1 ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'
              }`}>
                {generationStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold">PyMuPDF Document Extraction</p>
                <p className="text-[10px] text-slate-400">Parsing structure and cleaning whitespace</p>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border flex items-center gap-3 transition ${
              generationStep >= 2 ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-slate-800/30 border-slate-800 text-slate-500'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                generationStep > 2 ? 'bg-emerald-500 text-white' : generationStep === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'
              }`}>
                {generationStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold">Semantic Chunking & Conceptual Retrieval</p>
                <p className="text-[10px] text-slate-400">Filtering top informative text segments for {targetSkill || 'cadre'}</p>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border flex items-center gap-3 transition ${
              generationStep >= 3 ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-slate-800/30 border-slate-800 text-slate-500'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                generationStep === 3 ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'
              }`}>
                3
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold">LLM MCQ & Explanation Synthesis ({selectedLanguage})</p>
                <p className="text-[10px] text-slate-400">Formulating {numQuestions} questions in {selectedLanguage} with ground-truth explanations</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW STATE 3: TAKING THE QUIZ */}
      {viewState === 'taking' && activeQuiz && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header & Question Navigation Bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                  {activeQuiz.skill_name || 'Official Competency'}
                </span>
                <h2 className="text-lg font-bold text-white">{activeQuiz.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">
                  Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {activeQuiz.language === 'Hindi' ? '🇮🇳 हिन्दी' : '🇬🇧 English'}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {activeQuiz.questions[currentQuestionIdx].difficulty}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-sky-400 h-full transition-all duration-300"
                style={{
                  width: `${((currentQuestionIdx + 1) / activeQuiz.questions.length) * 100}%`,
                }}
              />
            </div>

            {/* Question Selector Dots */}
            <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
              {activeQuiz.questions.map((q, idx) => {
                const isAnswered = !!userAnswers[q.id];
                const isCurrent = idx === currentQuestionIdx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIdx(idx)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                      isCurrent
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900'
                        : isAnswered
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Question Card */}
          {(() => {
            const currentQ = activeQuiz.questions[currentQuestionIdx];
            const currentChoice = userAnswers[currentQ.id];

            return (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
                <div className="mb-6">
                  <p className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed">
                    {currentQ.question}
                  </p>
                </div>

                {/* Options List */}
                <div className="space-y-3.5">
                  {(['A', 'B', 'C', 'D'] as const).map((key) => {
                    const optText = currentQ.options[key];
                    const isSelected = currentChoice === key;

                    return (
                      <div
                        key={key}
                        onClick={() => handleSelectOption(currentQ.id, key)}
                        className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-4 ${
                          isSelected
                            ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-md'
                            : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/70 text-slate-300 hover:text-white'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 transition ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 border border-slate-700 text-slate-400'
                          }`}
                        >
                          {key}
                        </div>
                        <div className="flex-1 text-xs sm:text-sm font-medium pt-0.5 leading-normal">
                          {optText}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIdx((p) => Math.max(0, p - 1))}
                    disabled={currentQuestionIdx === 0}
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                      currentQuestionIdx === 0
                        ? 'text-slate-600 cursor-not-allowed'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Previous
                  </button>

                  {currentQuestionIdx < activeQuiz.questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentQuestionIdx((p) => p + 1)}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md shadow-indigo-600/20"
                    >
                      Next Question
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSubmitQuiz(false)}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition shadow-lg shadow-emerald-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>Scoring Answers...</>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Submit Assessment
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Submit Error Message Banner */}
                {submitErrorMessage && (
                  <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 flex items-center justify-between gap-3 text-rose-300 text-xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      <span>{submitErrorMessage}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSubmitQuiz(true)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-semibold transition flex items-center gap-1 flex-shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Unanswered Questions Warning Modal */}
          {showUnansweredWarning && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center gap-3 text-amber-400">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Unanswered Questions</h3>
                    <p className="text-xs text-amber-400/90">Confirmation Required</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  You have answered{' '}
                  <span className="font-bold text-white">{Object.keys(userAnswers).length}</span> of{' '}
                  <span className="font-bold text-white">{activeQuiz.questions.length}</span> questions.
                  Any unanswered questions will be marked incorrect and will impact your competency score.
                </p>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUnansweredWarning(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                  >
                    Review Answers
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmitQuiz(true)}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-lg shadow-amber-600/25"
                  >
                    Submit Anyway
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW STATE 4: RESULTS & ADAPTIVE PROFILE ELEVATION */}
      {viewState === 'results' && quizResults && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Results Hero Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-xl text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
              <Award className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-extrabold text-white">
              Assessment Completed!
            </h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 inline-flex items-center gap-1.5">
                <span>{quizResults.language === 'Hindi' ? '🇮🇳 भाषा: हिन्दी (Hindi)' : '🇬🇧 Language: English'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
              Evaluation scored against official document ground truth and mission requirements.
            </p>

            <div className="flex items-center justify-center gap-4 mt-6">
              <div className="px-6 py-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                <span className="text-xs text-slate-400 block">Score</span>
                <span className="text-2xl font-black text-white">
                  {quizResults.score} / {quizResults.total_questions}
                </span>
              </div>
              <div className="px-6 py-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                <span className="text-xs text-slate-400 block">Proficiency Rating</span>
                <span
                  className={`text-2xl font-black ${
                    quizResults.score_percentage >= 80
                      ? 'text-emerald-400'
                      : quizResults.score_percentage >= 50
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {quizResults.score_percentage}%
                </span>
              </div>
            </div>

            {/* ADAPTIVE COMPETENCY ELEVATION BANNER */}
            {quizResults.skill_update && (
              <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/30 to-teal-950/40 border border-emerald-500/40 text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400">
                      Adaptive Competency Elevation
                    </span>
                    <p className="text-sm font-bold text-white">
                      {quizResults.skill_update.skill_name}
                    </p>
                    <p className="text-xs text-emerald-200/90 mt-0.5">
                      Proficiency increased from{' '}
                      <span className="font-semibold text-white">
                        {quizResults.skill_update.previous_level}%
                      </span>{' '}
                      →{' '}
                      <span className="font-semibold text-emerald-300">
                        {quizResults.skill_update.new_level}%
                      </span>{' '}
                      (+{quizResults.skill_update.delta}%)
                    </p>
                  </div>
                </div>

                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 self-start sm:self-auto flex-shrink-0"
                >
                  View on Radar
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Per-Question Explanations Diagnostic */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
              Question-by-Question Breakdown & Citations
            </h3>

            <div className="space-y-4 mt-4">
              {quizResults.results.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-5 rounded-xl border ${
                    item.is_correct
                      ? 'bg-emerald-950/15 border-emerald-500/30'
                      : 'bg-rose-950/15 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-2.5">
                      {item.is_correct ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="text-[11px] font-bold text-slate-400">Question {idx + 1}</span>
                        <p className="text-xs sm:text-sm font-semibold text-slate-100">{item.question}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {item.difficulty}
                    </span>
                  </div>

                  {/* Chosen vs Correct Option */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3 pl-7">
                    <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 block">Your Answer</span>
                      <p className={`font-semibold ${item.is_correct ? 'text-emerald-300' : 'text-rose-300'}`}>
                        Option {item.user_answer || 'None'}:{' '}
                        {item.user_answer ? item.options[item.user_answer as keyof typeof item.options] : 'Unanswered'}
                      </p>
                    </div>

                    {!item.is_correct && (
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-[10px] text-emerald-400 block">Correct Ground Truth</span>
                        <p className="font-semibold text-emerald-300">
                          Option {item.correct_answer}:{' '}
                          {item.options[item.correct_answer as keyof typeof item.options]}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Ground Truth Explanation */}
                  <div className="pl-7">
                    <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40 text-xs text-slate-300 flex items-start gap-2">
                      <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-indigo-300">Official Ground Truth: </span>
                        {item.explanation}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Bottom Buttons */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/20"
            >
              <RotateCcw className="w-4 h-4" />
              Generate Another Quiz
            </button>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
