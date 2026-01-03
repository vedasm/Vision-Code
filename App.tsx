import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import Visualizer from './components/Visualizer';
import { analyzeCode } from './services/geminiService';
import { AnalysisResult, EditorMode, VisualizationFrame } from './types';

const CODE_TEMPLATES = {
  [EditorMode.PYTHON]: `class Node:
    def __init__(self, val):
        self.val = val
        self.next = None

# Step 1: Create Head
head = Node(1)

# Step 2: Create Second
second = Node(2)
head.next = second

# Step 3: Create Cycle
third = Node(3)
second.next = third
third.next = head 
`,
  [EditorMode.JAVASCRIPT]: `class Node {
  constructor(val) {
    this.val = val;
    this.next = null;
  }
}

// Step 1: Create Head
const head = new Node(1);

// Step 2: Create Second
const second = new Node(2);
head.next = second;

// Step 3: Create Cycle
const third = new Node(3);
second.next = third;
third.next = head;
`,
  [EditorMode.JAVA]: `public class Main {
    static class Node {
        int val;
        Node next;
        
        Node(int val) {
            this.val = val;
            this.next = null;
        }
    }

    public static void main(String[] args) {
        // Step 1: Create Head
        Node head = new Node(1);

        // Step 2: Create Second
        Node second = new Node(2);
        head.next = second;

        // Step 3: Create Cycle
        Node third = new Node(3);
        second.next = third;
        third.next = head;
    }
}
`
};

const App: React.FC = () => {
  const [mode, setMode] = useState<EditorMode>(EditorMode.PYTHON);
  const [code, setCode] = useState<string>(CODE_TEMPLATES[EditorMode.PYTHON]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Frame Management
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Toggle Theme Class on Body/HTML
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Handle Playback
  useEffect(() => {
    if (isPlaying && analysis && currentFrameIndex < analysis.frames.length - 1) {
      playbackRef.current = setTimeout(() => {
        setCurrentFrameIndex(prev => prev + 1);
      }, 1500); // 1.5s per step
    } else if (currentFrameIndex >= (analysis?.frames.length || 0) - 1) {
      setIsPlaying(false);
    }
    return () => {
      if (playbackRef.current) clearTimeout(playbackRef.current);
    }
  }, [isPlaying, currentFrameIndex, analysis]);

  const handleModeChange = (newMode: EditorMode) => {
    setMode(newMode);
    setCode(CODE_TEMPLATES[newMode]);
    // Reset analysis state when switching languages
    setAnalysis(null);
    setCurrentFrameIndex(0);
    setIsPlaying(false);
    setError(null);
  };

  const handleRun = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setCurrentFrameIndex(0);
    setIsPlaying(false);

    try {
      const result = await analyzeCode(code, mode);
      setAnalysis(result);
      if (result.frames.length > 0) {
        setCurrentFrameIndex(0);
      }
    } catch (err) {
      setError("Analysis failed. Please try again or check your API key.");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (analysis && currentFrameIndex < analysis.frames.length - 1) {
      setCurrentFrameIndex(prev => prev + 1);
      setIsPlaying(false);
    }
  };

  const handlePrev = () => {
    if (currentFrameIndex > 0) {
      setCurrentFrameIndex(prev => prev - 1);
      setIsPlaying(false);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentFrameIndex(parseInt(e.target.value));
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (currentFrameIndex >= (analysis?.frames.length || 0) - 1) {
      setCurrentFrameIndex(0); // Restart if at end
    }
    setIsPlaying(!isPlaying);
  };

  // Derived State
  const currentFrame: VisualizationFrame | null = analysis && analysis.frames.length > 0
    ? analysis.frames[currentFrameIndex]
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400">
              Vision Code
            </h1>
          </div>
          <div className="flex items-center gap-4">

            {/* Language Selector */}
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-md p-1 transition-colors duration-200">
              <button
                onClick={() => handleModeChange(EditorMode.PYTHON)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${mode === EditorMode.PYTHON ? 'bg-blue-600 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Python
              </button>
              <button
                onClick={() => handleModeChange(EditorMode.JAVASCRIPT)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${mode === EditorMode.JAVASCRIPT ? 'bg-yellow-600 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              >
                JavaScript
              </button>
              <button
                onClick={() => handleModeChange(EditorMode.JAVA)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${mode === EditorMode.JAVA ? 'bg-red-600 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Java
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Theme"
            >
              {isDarkMode ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Run Button */}
            <button
              onClick={handleRun}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all
                ${loading
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-900/50'
                }`}
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {loading ? 'Analyzing...' : 'Visualize'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">

        {/* Left Panel: Editor */}
        <section className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 min-h-[400px] transition-colors duration-200">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-200 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
            <h2 className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Source Code</h2>
            <span className="text-xs text-slate-500 italic">Auto-save: ON</span>
          </div>
          <div className="flex-1 relative">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="absolute inset-0 w-full h-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono text-sm p-4 resize-none focus:outline-none focus:ring-0 leading-relaxed transition-colors duration-200"
              spellCheck="false"
              placeholder="// Type your code here..."
            />
          </div>

          {/* Analysis Footer (in Editor Panel) */}
          {analysis && (
            <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 transition-colors duration-200">
              <h3 className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mb-2 uppercase">Code Analysis</h3>
              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 transition-colors duration-200">
                  <span className="block text-xs text-slate-500">Time Complexity</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{analysis.timeComplexity}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 transition-colors duration-200">
                  <span className="block text-xs text-slate-500">Space Complexity</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{analysis.spaceComplexity}</span>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800 transition-colors duration-200">
                <span className="block text-xs text-slate-500 mb-1">Detected Structure</span>
                <p className="text-slate-700 dark:text-slate-300 text-sm">{analysis.detectedStructure}</p>
              </div>
            </div>
          )}
        </section>

        {/* Right Panel: Visualization */}
        <section className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-200 relative">

          {/* Top Bar with Step Code & Controls */}
          <div className="flex flex-col bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200 z-10 shadow-sm">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Live Visualization</h2>
              <div className="flex items-center gap-2">
                {analysis && analysis.frames.length > 0 && (
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    Step {currentFrameIndex + 1} / {analysis.frames.length}
                  </span>
                )}
              </div>
            </div>

            {/* Playback Controls & Current Line */}
            {analysis && analysis.frames.length > 0 && (
              <div className="p-2 flex flex-col gap-2">
                {/* Code Trace Display */}
                <div className="bg-slate-100 dark:bg-slate-950 p-2 rounded-md border-l-4 border-blue-500 font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap text-slate-700 dark:text-slate-300">
                  <span className="text-blue-500 font-bold mr-2">&gt;</span>
                  {currentFrame?.lineCode || "Start"}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 mt-1">
                  <button
                    onClick={togglePlay}
                    className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    {isPlaying ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    )}
                  </button>

                  <button onClick={handlePrev} disabled={currentFrameIndex === 0} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>

                  <input
                    type="range"
                    min="0"
                    max={analysis.frames.length - 1}
                    value={currentFrameIndex}
                    onChange={handleSliderChange}
                    className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />

                  <button onClick={handleNext} disabled={currentFrameIndex === analysis.frames.length - 1} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 relative p-4 bg-slate-50 dark:bg-slate-950">
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-500/50 p-6 rounded-lg max-w-md text-center">
                  <h3 className="text-red-600 dark:text-red-500 font-bold mb-2">Analysis Error</h3>
                  <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
                </div>
              </div>
            ) : (
              <Visualizer
                nodes={currentFrame?.nodes || []}
                edges={currentFrame?.edges || []}
                loading={loading}
                isDarkMode={isDarkMode}
                emptyMessage="Enter code and click Visualize to see the step-by-step execution."
              />
            )}
          </div>

          {currentFrame && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur transition-colors duration-200">
              <div className="flex items-start gap-3">
                <div className="mt-1 min-w-[20px]">
                  <svg className="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Step {currentFrameIndex + 1} Explanation
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {currentFrame.explanation}
                  </p>
                  {currentFrameIndex === analysis!.frames.length - 1 && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase">Overall Concept:</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{analysis!.conceptExplanation}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;