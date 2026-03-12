/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  auth, 
  db, 
  signInWithPopup, 
  googleProvider, 
  signOut, 
  onAuthStateChanged,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  orderBy,
  limit,
  handleFirestoreError,
  OperationType
} from './firebase';
import { User } from 'firebase/auth';
import { Resource, ResourceType } from './types';
import { Search, Upload, BookOpen, GraduationCap, LogIn, LogOut, FileText, Download, Eye, Sparkles, X, Menu, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { explainTopic } from './services/geminiService';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ErrorBoundary } from './components/ErrorBoundary';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Navbar = ({ user, onLogin, onLogout, onNavigate, currentPage }: any) => (
  <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-6 py-4">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
      <div 
        className="flex items-center gap-2 cursor-pointer" 
        onClick={() => onNavigate('home')}
      >
        <div className="bg-indigo-600 p-2 rounded-lg">
          <GraduationCap className="text-white w-6 h-6" />
        </div>
        <span className="text-xl font-bold tracking-tight text-zinc-900">NoteRadar</span>
      </div>

      <div className="hidden md:flex items-center gap-8">
        <button 
          onClick={() => onNavigate('home')}
          className={cn("text-sm font-medium transition-colors", currentPage === 'home' ? "text-indigo-600" : "text-zinc-500 hover:text-zinc-900")}
        >
          Search
        </button>
        <button 
          onClick={() => onNavigate('upload')}
          className={cn("text-sm font-medium transition-colors", currentPage === 'upload' ? "text-indigo-600" : "text-zinc-500 hover:text-zinc-900")}
        >
          Upload
        </button>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full border border-zinc-200" />
            <button onClick={onLogout} className="text-zinc-500 hover:text-red-600 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button 
            onClick={onLogin}
            className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-zinc-800 transition-all"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
        )}
      </div>
    </div>
  </nav>
);

const ResourceCard = ({ resource, onView }: { resource: Resource, onView: (r: Resource) => void }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="group bg-white border border-zinc-200 rounded-2xl p-5 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={cn(
        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
        resource.type === 'PDF' ? "bg-red-50 text-red-600" : 
        resource.type === 'PPT' ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
      )}>
        {resource.type}
      </div>
      {resource.isExamMode && (
        <div className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md flex items-center gap-1 text-[10px] font-bold">
          <Sparkles className="w-3 h-3" /> EXAM MODE
        </div>
      )}
    </div>
    
    <h3 className="text-lg font-semibold text-zinc-900 mb-1 group-hover:text-indigo-600 transition-colors">
      {resource.title}
    </h3>
    <p className="text-sm text-zinc-500 mb-4 line-clamp-2">
      {resource.subject} • {resource.topic}
    </p>

    <div className="flex items-center gap-2 mt-auto">
      <button 
        onClick={() => onView(resource)}
        className="flex-1 flex items-center justify-center gap-2 bg-zinc-50 text-zinc-900 py-2 rounded-xl text-sm font-medium hover:bg-indigo-600 hover:text-white transition-all"
      >
        <Eye className="w-4 h-4" /> View
      </button>
      <a 
        href={resource.file_url} 
        download 
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 bg-zinc-50 text-zinc-500 rounded-xl hover:bg-zinc-100 transition-all"
      >
        <Download className="w-4 h-4" />
      </a>
    </div>
  </motion.div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<'home' | 'results' | 'upload' | 'viewer'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isExamMode, setIsExamMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Listener
  useEffect(() => {
    const path = 'resources';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource));
      setResources(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsubscribe();
  }, []);

  // Search Logic
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const queryLower = searchQuery.toLowerCase();
    const filtered = resources.filter(r => 
      (r.subject.toLowerCase().includes(queryLower) || 
       r.topic.toLowerCase().includes(queryLower) || 
       r.title.toLowerCase().includes(queryLower)) &&
      (!isExamMode || r.isExamMode)
    );
    setFilteredResources(filtered);
    setCurrentPage('results');
  };

  const toggleExamMode = () => {
    const nextMode = !isExamMode;
    setIsExamMode(nextMode);
    if (currentPage === 'results') {
      const filtered = resources.filter(r => 
        (r.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
         r.topic.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (!nextMode || r.isExamMode)
      );
      setFilteredResources(filtered);
    }
  };

  const [authError, setAuthError] = useState<string | null>(null);

  const handleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/popup-blocked') {
        setAuthError("Popup blocked! Please allow popups for this site in your browser settings and try again.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        setAuthError("Login was cancelled. Please try again.");
      } else {
        setAuthError("An error occurred during login. Please try again.");
      }
    }
  };

  const handleLogout = () => signOut(auth);

  const handleViewResource = (resource: Resource) => {
    setSelectedResource(resource);
    setAiExplanation(null);
    setCurrentPage('viewer');
  };

  const handleExplain = async () => {
    if (!selectedResource) return;
    setExplaining(true);
    const explanation = await explainTopic(selectedResource.topic, selectedResource.subject);
    setAiExplanation(explanation);
    setExplaining(false);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar 
        user={user} 
        onLogin={handleLogin} 
        onLogout={handleLogout} 
        onNavigate={setCurrentPage}
        currentPage={currentPage}
      />

      <AnimatePresence>
        {authError && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-50 border-b border-red-100 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-red-700 text-sm font-medium">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {authError}
              </div>
              <button onClick={() => setAuthError(null)} className="p-1 hover:bg-red-100 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {currentPage === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center text-center max-w-3xl mx-auto"
            >
              <div className="mb-8 inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-semibold">
                <Sparkles className="w-4 h-4" />
                Smart Academic Resource Finder
              </div>
              <h1 className="text-6xl font-extrabold tracking-tight mb-6 text-zinc-900 leading-tight">
                Find the best notes for <span className="text-indigo-600">any topic.</span>
              </h1>
              <p className="text-xl text-zinc-500 mb-12 max-w-2xl">
                NoteRadar helps you discover PDF notes, PPTs, and past papers instantly. Just type your subject and topic.
              </p>

              <form onSubmit={handleSearch} className="w-full relative mb-6">
                <input 
                  type="text" 
                  placeholder="e.g. Data Structures Trees"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border-2 border-zinc-200 rounded-2xl px-6 py-5 text-lg focus:outline-none focus:border-indigo-500 transition-all shadow-lg shadow-indigo-500/5"
                />
                <button 
                  type="submit"
                  className="absolute right-3 top-3 bottom-3 bg-indigo-600 text-white px-8 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                  <Search className="w-5 h-5" /> Search
                </button>
              </form>

              <div className="flex items-center gap-4">
                <button 
                  onClick={toggleExamMode}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all border-2",
                    isExamMode 
                      ? "bg-amber-50 border-amber-200 text-amber-700 shadow-lg shadow-amber-500/10" 
                      : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"
                  )}
                >
                  <Sparkles className={cn("w-5 h-5", isExamMode ? "fill-amber-500" : "")} />
                  Exam Mode {isExamMode ? 'ON' : 'OFF'}
                </button>
              </div>
            </motion.div>
          )}

          {currentPage === 'results' && (
            <motion.div 
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
                <div>
                  <h2 className="text-3xl font-bold text-zinc-900">Search Results</h2>
                  <p className="text-zinc-500">Found {filteredResources.length} resources for "{searchQuery}"</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={toggleExamMode}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border",
                      isExamMode ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-white border-zinc-200 text-zinc-600"
                    )}
                  >
                    Exam Mode
                  </button>
                  <button 
                    onClick={() => setCurrentPage('home')}
                    className="text-sm text-indigo-600 font-medium hover:underline"
                  >
                    New Search
                  </button>
                </div>
              </div>

              {filteredResources.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredResources.map(r => (
                    <ResourceCard key={r.id} resource={r} onView={handleViewResource} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-24 bg-white border border-dashed border-zinc-300 rounded-3xl">
                  <BookOpen className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">No resources found</h3>
                  <p className="text-zinc-500 mb-6">Try adjusting your search or turning off Exam Mode.</p>
                  <button 
                    onClick={() => setCurrentPage('home')}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all"
                  >
                    Go Back
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {currentPage === 'viewer' && selectedResource && (
            <motion.div 
              key="viewer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2">
                <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm h-[700px] flex flex-col">
                  <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="text-indigo-600 w-5 h-5" />
                      <span className="font-bold text-zinc-900 truncate max-w-[200px] md:max-w-md">
                        {selectedResource.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a 
                        href={selectedResource.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-zinc-200 rounded-lg transition-colors"
                      >
                        <Download className="w-5 h-5 text-zinc-600" />
                      </a>
                      <button 
                        onClick={() => setCurrentPage('results')}
                        className="p-2 hover:bg-zinc-200 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-zinc-600" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 bg-zinc-100 flex items-center justify-center">
                    {selectedResource.file_url.endsWith('.pdf') ? (
                      <iframe 
                        src={`${selectedResource.file_url}#toolbar=0`} 
                        className="w-full h-full border-none"
                        title="PDF Viewer"
                      />
                    ) : (
                      <div className="text-center p-12">
                        <div className="bg-white p-8 rounded-3xl shadow-sm inline-block mb-6">
                          <FileText className="w-16 h-16 text-indigo-600 mx-auto" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">PPT Resource</h3>
                        <p className="text-zinc-500 mb-8">This resource is a PPT file. You can download it to view locally.</p>
                        <a 
                          href={selectedResource.file_url} 
                          className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all inline-flex items-center gap-2"
                        >
                          <Download className="w-5 h-5" /> Download PPT
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-xl font-bold mb-4">Resource Details</h3>
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1">Subject</span>
                      <p className="font-medium">{selectedResource.subject}</p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1">Topic</span>
                      <p className="font-medium">{selectedResource.topic}</p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1">Description</span>
                      <p className="text-sm text-zinc-600">{selectedResource.description || 'No description provided.'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="text-xl font-bold">AI Tutor</h3>
                  </div>
                  <p className="text-indigo-100 text-sm mb-6">
                    Need a quick summary? Our AI can explain this topic with key exam points.
                  </p>
                  <button 
                    onClick={handleExplain}
                    disabled={explaining}
                    className="w-full bg-white text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {explaining ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                    Explain Topic
                  </button>
                </div>

                {aiExplanation && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-indigo-200 rounded-3xl p-6 shadow-sm prose prose-indigo prose-sm max-w-none"
                  >
                    <ReactMarkdown>{aiExplanation}</ReactMarkdown>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {currentPage === 'upload' && (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">Upload Resource</h2>
                <p className="text-zinc-500">Share your notes and help other students succeed.</p>
              </div>

              {!user ? (
                <div className="bg-white border border-zinc-200 rounded-3xl p-12 text-center">
                  <AlertCircle className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Sign in to upload</h3>
                  <p className="text-zinc-500 mb-8">You need to be logged in to contribute resources to NoteRadar.</p>
                  <button 
                    onClick={handleLogin}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all inline-flex items-center gap-2"
                  >
                    <LogIn className="w-5 h-5" /> Sign In with Google
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  <UploadForm onComplete={() => setCurrentPage('home')} user={user} />
                  
                  <div className="bg-zinc-100 p-6 rounded-3xl border border-zinc-200 text-center">
                    <h4 className="font-bold mb-2">Demo Mode</h4>
                    <p className="text-xs text-zinc-500 mb-4">Quickly populate the database with sample academic resources.</p>
                    <button 
                      onClick={async () => {
                        const samples = [
                          { title: "Data Structures - Trees & Graphs", subject: "Data Structures", topic: "Trees", type: "PDF", file_url: "https://www.tutorialspoint.com/data_structures_algorithms/data_structures_algorithms_tutorial.pdf", description: "Comprehensive notes on tree traversal and graph algorithms.", isExamMode: true },
                          { title: "Operating Systems - Process Management", subject: "Operating Systems", topic: "Deadlock", type: "PDF", file_url: "https://www.cl.cam.ac.uk/teaching/1011/OpSystems/os-notes.pdf", description: "Detailed explanation of deadlock prevention and avoidance.", isExamMode: true },
                          { title: "Computer Networks - Routing Protocols", subject: "Computer Networks", topic: "Routing", type: "PDF", file_url: "https://www.net.t-labs.tu-berlin.de/teaching/ss06/cn1/materials/cn1-routing.pdf", description: "Overview of RIP, OSPF and BGP protocols.", isExamMode: false },
                          { title: "Database Systems - Normalization", subject: "DBMS", topic: "Normalization", type: "PDF", file_url: "https://www.cs.uct.ac.za/mit_notes/database/pdfs/Normalization.pdf", description: "1NF, 2NF, 3NF and BCNF explained with examples.", isExamMode: true }
                        ];
                        const path = 'resources';
                        try {
                          for (const s of samples) {
                            await addDoc(collection(db, path), { ...s, uploaded_by: user.uid, createdAt: serverTimestamp(), rating: 5 });
                          }
                          alert("Sample data seeded!");
                          setCurrentPage('home');
                        } catch (error) {
                          handleFirestoreError(error, OperationType.CREATE, path);
                        }
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                    >
                      Seed Sample Data
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

const UploadForm = ({ onComplete, user }: { onComplete: () => void, user: User }) => {
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    topic: '',
    type: 'PDF' as ResourceType,
    file_url: '',
    description: '',
    isExamMode: false
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const path = 'resources';
    try {
      await addDoc(collection(db, path), {
        ...formData,
        uploaded_by: user.uid,
        createdAt: serverTimestamp(),
        rating: 0
      });
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-700">Resource Title</label>
          <input 
            required
            type="text" 
            placeholder="e.g. Tree Traversal Notes"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-700">Resource Type</label>
          <select 
            value={formData.type}
            onChange={e => setFormData({...formData, type: e.target.value as ResourceType})}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-all"
          >
            <option value="PDF">PDF</option>
            <option value="PPT">PPT</option>
            <option value="Question Paper">Question Paper</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-700">Subject</label>
          <input 
            required
            type="text" 
            placeholder="e.g. Data Structures"
            value={formData.subject}
            onChange={e => setFormData({...formData, subject: e.target.value})}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-700">Topic</label>
          <input 
            required
            type="text" 
            placeholder="e.g. Binary Trees"
            value={formData.topic}
            onChange={e => setFormData({...formData, topic: e.target.value})}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-zinc-700">File URL (Direct Link)</label>
        <input 
          required
          type="url" 
          placeholder="https://example.com/notes.pdf"
          value={formData.file_url}
          onChange={e => setFormData({...formData, file_url: e.target.value})}
          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-all"
        />
        <p className="text-[10px] text-zinc-400 italic">Note: For this demo, please provide a direct URL to a PDF or PPT file.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-zinc-700">Description</label>
        <textarea 
          placeholder="Briefly describe what's in this resource..."
          value={formData.description}
          onChange={e => setFormData({...formData, description: e.target.value})}
          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 h-32 focus:outline-none focus:border-indigo-500 transition-all"
        />
      </div>

      <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
        <input 
          type="checkbox" 
          id="isExamMode"
          checked={formData.isExamMode}
          onChange={e => setFormData({...formData, isExamMode: e.target.checked})}
          className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
        />
        <label htmlFor="isExamMode" className="text-sm font-bold text-amber-800 cursor-pointer">
          Mark as high-priority Exam Resource
        </label>
      </div>

      <button 
        type="submit"
        disabled={submitting}
        className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
        Publish Resource
      </button>
    </form>
  );
};
