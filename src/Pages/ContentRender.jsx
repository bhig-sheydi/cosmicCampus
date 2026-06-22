import React, { 
  useState, 
  useEffect, 
  useMemo, 
  useRef, 
  useCallback,
  useLayoutEffect,
} from 'react';
import { useUser } from "../components/Contexts/userContext";
import { supabase } from '@/supabaseClient';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  Search, 
  ChevronLeft, 
  GraduationCap, 
  FileText, 
  Clock, 
  X,
  School,
  BookOpen,
  PanelLeft,
  List,
  Loader2,
  Image as ImageIcon,
  Code,
  Quote,
  AlertCircle,
  RefreshCw,
  Bookmark,
  BookmarkCheck,
  Eye,
  EyeOff,
  RotateCcw,
  Trash2,
  AlertTriangle,
  WifiOff,
  Timer,
  History,
  Sparkles,
  Settings,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const NOTES_PER_PAGE = 20;
const SCROLL_RESTORE_KEY = 'edu_notes_scroll_pos';
const READING_PROGRESS_KEY = 'edu_notes_reading_progress';
const RECENTLY_VIEWED_KEY = 'edu_notes_recently_viewed';
const BOOKMARKS_KEY = 'edu_notes_bookmarks';
const MAX_RECENT = 10;
const MAX_BOOKMARKS = 50;

// ==========================================
// UTILITY: Safe JSON parse
// ==========================================
const safeJsonParse = (str, fallback = null) => {
  if (!str) return fallback;
  try {
    return typeof str === 'string' ? JSON.parse(str) : str;
  } catch {
    return fallback;
  }
};

// ==========================================
// UTILITY: LocalStorage helpers
// ==========================================
const storage = {
  get: (key, fallback = null) => safeJsonParse(localStorage.getItem(key), fallback),
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
  remove: (key) => localStorage.removeItem(key),
  getKeysByPrefix: (prefix) => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) keys.push(key);
    }
    return keys;
  },
};

// ==========================================
// UTILITY: Debounce hook
// ==========================================
const useDebounce = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

// ==========================================
// UTILITY: Intersection Observer for active section
// ==========================================
const useActiveSection = (sectionIds, options = {}) => {
  const [activeId, setActiveId] = useState(null);
  const observerRef = useRef(null);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!sectionIds.length) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '-80px 0px -40% 0px', ...options }
    );

    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observerRef.current.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [sectionIds.join(','), options.rootMargin]);

  return activeId;
};

// ==========================================
// UTILITY: Network status hook
// ==========================================
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setWasOffline(true); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, wasOffline, setWasOffline };
};

// ==========================================
// READING PROGRESS HOOK (WITH RESET)
// ==========================================
const useReadingProgress = (noteId, chunkIds) => {
  const [progress, setProgress] = useState(0);
  const [completedSections, setCompletedSections] = useState(new Set());

  const storageKey = noteId ? `${READING_PROGRESS_KEY}_${noteId}` : null;

  useEffect(() => {
    if (!storageKey) {
      setCompletedSections(new Set());
      setProgress(0);
      return;
    }
    const saved = storage.get(storageKey, { completed: [], progress: 0 });
    const completedSet = new Set(saved.completed || []);
    setCompletedSections(completedSet);
    setProgress(saved.progress || 0);
  }, [storageKey]);

  const saveProgress = useCallback((completedSet) => {
    if (!storageKey) return;
    const newProgress = chunkIds.length > 0 
      ? Math.round((completedSet.size / chunkIds.length) * 100) 
      : 0;
    storage.set(storageKey, {
      completed: Array.from(completedSet),
      progress: newProgress,
      lastRead: new Date().toISOString(),
    });
    setProgress(newProgress);
  }, [storageKey, chunkIds.length]);

  const markSectionComplete = useCallback((chunkId) => {
    setCompletedSections(prev => {
      if (prev.has(chunkId)) return prev;
      const next = new Set(prev);
      next.add(chunkId);
      saveProgress(next);
      return next;
    });
  }, [saveProgress]);

  const unmarkSection = useCallback((chunkId) => {
    setCompletedSections(prev => {
      if (!prev.has(chunkId)) return prev;
      const next = new Set(prev);
      next.delete(chunkId);
      saveProgress(next);
      return next;
    });
  }, [saveProgress]);

  const resetNoteProgress = useCallback(() => {
    if (!storageKey) return;
    storage.remove(storageKey);
    setCompletedSections(new Set());
    setProgress(0);
  }, [storageKey]);

  return { progress, completedSections, markSectionComplete, unmarkSection, resetNoteProgress };
};

// ==========================================
// GLOBAL PROGRESS RESET UTILITY
// ==========================================
const resetAllProgress = () => {
  const keys = storage.getKeysByPrefix(READING_PROGRESS_KEY);
  keys.forEach(key => localStorage.removeItem(key));
};

const getProgressSummary = () => {
  const keys = storage.getKeysByPrefix(READING_PROGRESS_KEY);
  const summary = [];
  keys.forEach(key => {
    const data = storage.get(key);
    const noteId = key.replace(`${READING_PROGRESS_KEY}_`, '');
    if (data) {
      summary.push({ noteId, progress: data.progress, lastRead: data.lastRead });
    }
  });
  return summary;
};

// ==========================================
// BOOKMARKS HOOK
// ==========================================
const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState(() => storage.get(BOOKMARKS_KEY, []));

  const toggleBookmark = useCallback((note) => {
    setBookmarks(prev => {
      const exists = prev.find(b => b.id === note.id);
      let next;
      if (exists) {
        next = prev.filter(b => b.id !== note.id);
      } else {
        next = [{ 
          id: note.id, 
          title: note.title, 
          subject_id: note.subject_id,
          class_id: note.class_id,
          timestamp: Date.now(),
        }, ...prev].slice(0, MAX_BOOKMARKS);
      }
      storage.set(BOOKMARKS_KEY, next);
      return next;
    });
  }, []);

  const removeBookmark = useCallback((noteId) => {
    setBookmarks(prev => {
      const next = prev.filter(b => b.id !== noteId);
      storage.set(BOOKMARKS_KEY, next);
      return next;
    });
  }, []);

  const isBookmarked = useCallback((noteId) => bookmarks.some(b => b.id === noteId), [bookmarks]);

  return { bookmarks, toggleBookmark, removeBookmark, isBookmarked };
};

// ==========================================
// RECENTLY VIEWED HOOK
// ==========================================
const useRecentlyViewed = () => {
  const [recent, setRecent] = useState(() => storage.get(RECENTLY_VIEWED_KEY, []));

  const addRecent = useCallback((note) => {
    setRecent(prev => {
      const filtered = prev.filter(r => r.id !== note.id);
      const next = [{ 
        id: note.id, 
        title: note.title, 
        subject_id: note.subject_id,
        viewedAt: Date.now(),
      }, ...filtered].slice(0, MAX_RECENT);
      storage.set(RECENTLY_VIEWED_KEY, next);
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    storage.remove(RECENTLY_VIEWED_KEY);
    setRecent([]);
  }, []);

  return { recent, addRecent, clearRecent };
};

// ==========================================
// SKELETON COMPONENTS
// ==========================================
const NoteCardSkeleton = () => (
  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm h-full animate-pulse">
    <div className="flex justify-between items-start mb-3">
      <div className="h-5 w-20 bg-slate-200 rounded-full" />
      <div className="h-3 w-16 bg-slate-200 rounded" />
    </div>
    <div className="h-6 w-3/4 bg-slate-200 rounded mb-2" />
    <div className="h-4 w-1/2 bg-slate-200 rounded" />
    <div className="mt-auto pt-3 border-t border-slate-100">
      <div className="h-3 w-24 bg-slate-200 rounded" />
    </div>
  </div>
);

const ChunkSkeleton = () => (
  <div className="mb-10 animate-pulse">
    <div className="h-7 w-3/4 bg-slate-200 rounded mb-4" />
    <div className="space-y-3">
      <div className="h-4 w-full bg-slate-100 rounded" />
      <div className="h-4 w-5/6 bg-slate-100 rounded" />
      <div className="h-4 w-4/6 bg-slate-100 rounded" />
    </div>
  </div>
);

// ==========================================
// CONTENT RENDERER
// ==========================================
const ContentRenderer = ({ bodyJson, onRenderError }) => {
  const content = useMemo(() => {
    try {
      return typeof bodyJson === 'string' ? JSON.parse(bodyJson) : bodyJson;
    } catch (e) {
      onRenderError?.(e);
      return null;
    }
  }, [bodyJson, onRenderError]);

  if (content === null) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-2 text-amber-700">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">This section could not be loaded properly.</span>
        </div>
      </div>
    );
  }

  if (!Array.isArray(content)) {
    if (typeof content === 'string') {
      return <p className="text-slate-600 leading-relaxed text-lg">{content}</p>;
    }
    return <div className="text-slate-500 italic">No content available</div>;
  }

  return (
    <div className="space-y-6">
      {content.map((block, idx) => {
        if (!block || !block.type) {
          console.warn('[ContentRenderer] Block missing type:', block);
          return null;
        }

        switch (block.type) {
          case 'heading':
            return <h3 key={idx} className="text-2xl font-bold text-slate-800 mt-8 mb-4">{block.content}</h3>;

          case 'paragraph':
          case 'body':
            return <p key={idx} className="text-slate-600 leading-relaxed text-lg">{block.content}</p>;

          case 'list':
            return (
              <ul key={idx} className="list-disc pl-6 space-y-2 marker:text-blue-500">
                {block.items?.map((item, i) => (
                  <li key={i} className="text-slate-700">{item}</li>
                )) || <li className="text-slate-400 italic">Empty list</li>}
              </ul>
            );

          case 'explanation':
            return (
              <div key={idx} className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg my-6">
                <div className="flex items-start gap-3">
                  <span className="text-blue-600 mt-1 shrink-0">💡</span>
                  <p className="text-blue-900 italic">{block.content}</p>
                </div>
              </div>
            );

          case 'image':
            return (
              <div key={idx} className="my-6">
                {block.src ? (
                  <figure>
                    <img 
                      src={block.src} 
                      alt={block.alt || 'Image'} 
                      className="w-full max-w-2xl rounded-xl shadow-md mx-auto"
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="hidden items-center justify-center p-8 bg-slate-100 rounded-xl text-slate-400">
                      <ImageIcon className="w-8 h-8 mr-2" />
                      <span>Image failed to load</span>
                    </div>
                    {block.caption && (
                      <figcaption className="text-center text-sm text-slate-500 mt-2 italic">
                        {block.caption}
                      </figcaption>
                    )}
                  </figure>
                ) : (
                  <div className="flex items-center justify-center p-8 bg-slate-100 rounded-xl text-slate-400">
                    <ImageIcon className="w-8 h-8 mr-2" />
                    <span>Image not available</span>
                  </div>
                )}
              </div>
            );

          case 'code':
            return (
              <div key={idx} className="my-6 rounded-xl overflow-hidden bg-slate-900">
                {block.language && (
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                    <span className="text-xs text-slate-400 font-mono">{block.language}</span>
                    <Code className="w-4 h-4 text-slate-500" />
                  </div>
                )}
                <pre className="p-4 overflow-x-auto">
                  <code className="text-sm font-mono text-slate-300">{block.content}</code>
                </pre>
              </div>
            );

          case 'quote':
            return (
              <blockquote key={idx} className="border-l-4 border-slate-300 pl-6 py-2 my-6 italic text-slate-600 bg-slate-50 rounded-r-lg">
                <div className="flex items-start gap-3">
                  <Quote className="w-5 h-5 text-slate-400 shrink-0 mt-1" />
                  <div>
                    <p className="text-lg leading-relaxed">{block.content}</p>
                    {block.author && (
                      <cite className="text-sm text-slate-500 not-italic mt-2 block">— {block.author}</cite>
                    )}
                  </div>
                </div>
              </blockquote>
            );

          case 'divider':
            return <hr key={idx} className="my-8 border-slate-200" />;

          case 'table': {
            const tableData = block.content || block.raw?.content || block.data;
            if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
              return (
                <div key={idx} className="p-4 bg-slate-50 rounded-lg text-slate-400 italic text-sm">
                  Empty table
                </div>
              );
            }

            let headers = [], rows = [];

            if (tableData[0]?.type === 'tableRow') {
              const firstRow = tableData[0];
              headers = firstRow.content
                ?.filter(cell => cell.type === 'tableHeader')
                ?.map(cell => {
                  const para = cell.content?.find(c => c.type === 'paragraph');
                  const textNode = para?.content?.find(c => c.type === 'text');
                  return textNode?.text || '';
                }) || [];

              rows = tableData.slice(1).map(row => {
                return row.content
                  ?.filter(cell => cell.type === 'tableCell')
                  ?.map(cell => {
                    const para = cell.content?.find(c => c.type === 'paragraph');
                    const textNode = para?.content?.find(c => c.type === 'text');
                    return textNode?.text || '';
                  }) || [];
              });
            } else if (Array.isArray(tableData[0])) {
              headers = tableData[0];
              rows = tableData.slice(1);
            } else if (typeof tableData[0] === 'object') {
              headers = Object.keys(tableData[0] || {});
              rows = tableData;
            }

            if (headers.length === 0) {
              return (
                <div key={idx} className="p-4 bg-slate-50 rounded-lg text-slate-400 italic text-sm">
                  Invalid table format
                </div>
              );
            }

            return (
              <div key={idx} className="overflow-x-auto my-6 rounded-xl border border-slate-200 shadow-sm">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-900 uppercase font-semibold">
                    <tr>{headers.map((h, i) => <th key={i} className="px-6 py-4">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
                        {Array.isArray(row) 
                          ? row.map((cell, cIdx) => <td key={cIdx} className="px-6 py-4">{cell}</td>)
                          : headers.map((h, cIdx) => <td key={cIdx} className="px-6 py-4">{row[h]}</td>)
                        }
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          default: {
            console.warn('[ContentRenderer] Unknown block type:', block.type);
            return block.content 
              ? <p key={idx} className="text-slate-600">{typeof block.content === 'string' ? block.content : JSON.stringify(block.content)}</p>
              : null;
          }
        }
      })}
    </div>
  );
};

// ==========================================
// NOTE CARD
// ==========================================
const NoteCard = ({ note, subject, onClick, isBookmarked, onToggleBookmark }) => {
  const getSubjectStyle = (subject) => {
    if (!subject) return { bg: 'bg-slate-100', text: 'text-slate-600' };

    const VALID_COLORS = new Set([
      'blue', 'red', 'green', 'yellow', 'purple', 'pink', 
      'indigo', 'orange', 'teal', 'cyan', 'slate', 'gray'
    ]);

    if (subject.color && VALID_COLORS.has(subject.color.toLowerCase())) {
      const color = subject.color.toLowerCase();
      return { bg: `bg-${color}-100`, text: `text-${color}-700` };
    }

    const fallbackColors = [
      { bg: 'bg-blue-100', text: 'text-blue-700' },
      { bg: 'bg-green-100', text: 'text-green-700' },
      { bg: 'bg-purple-100', text: 'text-purple-700' },
      { bg: 'bg-orange-100', text: 'text-orange-700' },
      { bg: 'bg-pink-100', text: 'text-pink-700' },
      { bg: 'bg-teal-100', text: 'text-teal-700' },
    ];
    const index = (subject.id || 0) % fallbackColors.length;
    return fallbackColors[index];
  };

  const subjectStyle = getSubjectStyle(subject);
  const updatedDate = note.updated_at 
    ? new Date(note.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'No date';

  return (
    <div 
      onClick={onClick}
      className="group bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-3">
        <span className={cn(
          "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
          `${subjectStyle.bg} ${subjectStyle.text}`
        )}>
          {subject?.subject_name || "General"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleBookmark?.(note); }}
            className={cn(
              "p-1 rounded-full transition-colors",
              isBookmarked 
                ? "text-amber-500 hover:text-amber-600" 
                : "text-slate-300 hover:text-amber-400 opacity-0 group-hover:opacity-100"
            )}
            title={isBookmarked ? "Remove bookmark" : "Bookmark this note"}
          >
            {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
          <span className="text-slate-400 text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {updatedDate}
          </span>
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
        {note.title || 'Untitled Note'}
      </h3>
      <div className="mt-auto pt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <FileText className="w-3 h-3" />
          <span>{note.chunk_count ?? 0} sections</span>
        </div>
        {note.reading_progress > 0 && (
          <span className="text-blue-500 font-medium">{note.reading_progress}% read</span>
        )}
      </div>
    </div>
  );
};

// ==========================================
// CLASS SELECTOR
// ==========================================
const ClassSubjectSelector = ({ classes, subjects, selectedClass, selectedSubject, onSelectClass, onSelectSubject, disabled }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1">
        <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <select
          value={selectedClass || ''}
          onChange={(e) => onSelectClass(e.target.value ? Number(e.target.value) : null)}
          disabled={disabled}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 appearance-none cursor-pointer disabled:opacity-50"
        >
          <option value="">All Classes</option>
          {classes.map((cls) => (
            <option key={cls.class_id} value={cls.class_id}>
              {cls.class_name || `Class ${cls.class_id}`}
            </option>
          ))}
        </select>
      </div>

      <div className="relative flex-1">
        <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <select
          value={selectedSubject || ''}
          onChange={(e) => onSelectSubject(e.target.value ? Number(e.target.value) : null)}
          disabled={disabled || !selectedClass}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 appearance-none cursor-pointer disabled:opacity-50"
        >
          <option value="">All Subjects</option>
          {subjects.map((subj) => (
            <option key={subj.id} value={subj.id}>
              {subj.subject_name || `Subject ${subj.id}`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

// ==========================================
// CONFIRMATION MODAL
// ==========================================
const ConfirmModal = ({ isOpen, title, message, confirmText, confirmVariant = 'danger', onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className={cn(
            "p-2 rounded-full",
            confirmVariant === 'danger' ? "bg-red-100" : "bg-amber-100"
          )}>
            <AlertTriangle className={cn(
              "w-5 h-5",
              confirmVariant === 'danger' ? "text-red-600" : "text-amber-600"
            )} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors",
              confirmVariant === 'danger' 
                ? "bg-red-600 hover:bg-red-700" 
                : "bg-amber-600 hover:bg-amber-700"
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// STALE CONTENT BANNER
// ==========================================
const StaleContentBanner = ({ onRefresh }) => (
  <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
    <div className="max-w-6xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-2 text-amber-700 text-sm">
        <Sparkles className="w-4 h-4" />
        <span>New content may be available</span>
      </div>
      <button 
        onClick={onRefresh}
        className="text-sm text-amber-700 font-medium hover:text-amber-900 flex items-center gap-1"
      >
        <RefreshCw className="w-3 h-3" />
        Refresh
      </button>
    </div>
  </div>
);

// ==========================================
// OFFLINE BANNER
// ==========================================
const OfflineBanner = ({ onDismiss }) => (
  <div className="bg-slate-800 text-white px-4 py-2">
    <div className="max-w-6xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        <WifiOff className="w-4 h-4" />
        <span>You are offline. Some features may be limited.</span>
      </div>
      <button onClick={onDismiss} className="text-slate-400 hover:text-white">
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// ==========================================
// RATE LIMIT ERROR UI
// ==========================================
const RateLimitError = ({ retryAfter, onRetry }) => {
  const [countdown, setCountdown] = useState(retryAfter);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center">
        <Timer className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Too many requests</h3>
        <p className="text-slate-500 mb-4">
          Please wait {countdown > 0 ? `${countdown}s` : 'a moment'} before trying again.
        </p>
        {countdown <= 0 && (
          <button 
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

// ==========================================
// READING PROGRESS BAR
// ==========================================
const ReadingProgressBar = ({ progress }) => (
  <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-slate-100">
    <div 
      className="h-full bg-blue-600 transition-all duration-300"
      style={{ width: `${progress}%` }}
    />
  </div>
);

// ==========================================
// RECENTLY VIEWED STRIP
// ==========================================
const RecentlyViewedStrip = ({ recent, onNoteClick, onClear }) => {
  const [expanded, setExpanded] = useState(false);
  if (!recent.length) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-3 w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">Recently viewed</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onClear}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded"
            title="Clear history"
          >
            Clear
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-slate-600"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className={cn(
        "flex gap-2 overflow-x-auto pb-2 scrollbar-hide transition-all",
        expanded ? "max-h-40" : "max-h-10"
      )}>
        {recent.map(item => (
          <button
            key={item.id}
            onClick={() => onNoteClick(item)}
            className="flex-shrink-0 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            <span className="truncate max-w-[200px] block">{item.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// PROGRESS SETTINGS PANEL
// ==========================================
const ProgressSettingsPanel = ({ isOpen, onClose, onResetAll }) => {
  const [summary, setSummary] = useState([]);

  useEffect(() => {
    if (isOpen) setSummary(getProgressSummary());
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Reading Progress
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {summary.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Eye className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No reading progress yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-500 mb-3">
                {summary.length} note{summary.length !== 1 ? 's' : ''} with progress
              </p>
              {summary.map(item => (
                <div key={item.noteId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-slate-700">Note {item.noteId.slice(0, 8)}...</span>
                    <span className="text-xs text-slate-400 ml-2">
                      {item.lastRead ? new Date(item.lastRead).toLocaleDateString() : 'Unknown date'}
                    </span>
                  </div>
                  <span className={cn(
                    "text-sm font-medium",
                    item.progress === 100 ? "text-green-600" : "text-blue-600"
                  )}>
                    {item.progress}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={onResetAll}
            disabled={summary.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Reset All Progress
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// FETCH FUNCTIONS
// ==========================================
const STUDENT_SELECT = '*,schools:school_id(name),class:class_id(class_id,class_name)';

const fetchStudent = async (userId) => {
  if (!userId) return null;

  let { data, error } = await supabase
    .from('students')
    .select(STUDENT_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (!data && !error) {
    ({ data, error } = await supabase
      .from('students')
      .select(STUDENT_SELECT)
      .eq('auth_user_id', userId)
      .maybeSingle());
  }

  if (error) throw error;
  return data ? { ...data, school_name: data.schools?.name } : null;
};

const fetchSchoolMetadata = async (schoolId, proprietorId) => {
  const cacheKey = `school_meta_${schoolId}`;
  const cached = sessionStorage.getItem(cacheKey);

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      sessionStorage.removeItem(cacheKey);
    }
  }

  const [clsRes, subjRes, csRes] = await Promise.all([
    supabase.from('class').select('class_id,class_name'),
    supabase.from('subjects').select('id,subject_name'),
    supabase.from('class_subjects').select('class_id,subject_id,arm_id').eq('proprietor_id', proprietorId),
  ]);

  if (clsRes.error) throw clsRes.error;
  if (subjRes.error) throw subjRes.error;
  if (csRes.error) throw csRes.error;

  const payload = {
    classes: clsRes.data || [],
    subjects: subjRes.data || [],
    classSubjects: csRes.data || [],
  };

  sessionStorage.setItem(cacheKey, JSON.stringify(payload));
  return payload;
};

// ==========================================
// FIXED: fetchNotesPage - only apply class filter when explicitly selected
// ==========================================
const fetchNotesPage = async ({ pageParam = 0, student, selectedClass, selectedSubject, debouncedSearch }) => {
  if (!student?.school_id) return { notes: [], total: 0 };

  let query = supabase
    .from('note_table')
    .select('id,title,subject_id,class_id,updated_at,chunk_count', { count: 'exact' })
    .eq('school_id', student.school_id)
    .order('updated_at', { ascending: false })
    .range(pageParam * NOTES_PER_PAGE, (pageParam + 1) * NOTES_PER_PAGE - 1);

  // Only apply class filter if user explicitly selected a class.
  // If selectedClass is null (All Classes), show all notes for the school.
  if (selectedClass !== null && selectedClass !== undefined) {
    query = query.eq('class_id', selectedClass);
  }

  if (selectedSubject !== null && selectedSubject !== undefined) {
    query = query.eq('subject_id', selectedSubject);
  }

  if (debouncedSearch.trim()) {
    query = query.ilike('title', `%${debouncedSearch.trim()}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    if (error.status === 429) {
      const retryAfter = parseInt(error.headers?.['retry-after'] || '60', 10);
      throw { ...error, isRateLimit: true, retryAfter };
    }
    throw error;
  }

  return { 
    notes: data || [], 
    total: count || 0, 
    nextPage: (data?.length || 0) === NOTES_PER_PAGE ? pageParam + 1 : undefined 
  };
};

const fetchNoteChunks = async (noteId) => {
  const { data, error } = await supabase
    .from('lesson_chunks')
    .select('chunk_id,lesson_id,section_id,title,order_index,level,body,updated_at')
    .eq('lesson_id', noteId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
};

// ==========================================
// MAIN APP
// ==========================================
export default function StudentNotesApp() {
  const { userData } = useUser();
  const queryClient = useQueryClient();

  const [activeView, setActiveView] = useState('notes');
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [tocOpen, setTocOpen] = useState(true);
  const [showStaleBanner, setShowStaleBanner] = useState(false);
  const [renderErrors, setRenderErrors] = useState(new Map());
  const [dismissedOffline, setDismissedOffline] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmResetNote, setConfirmResetNote] = useState(false);
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [confirmClearRecent, setConfirmClearRecent] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  // NEW: Track whether we've done the initial class auto-selection
  const [hasInitializedClass, setHasInitializedClass] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const { isOnline, wasOffline, setWasOffline } = useNetworkStatus();
  const { bookmarks, toggleBookmark, removeBookmark, isBookmarked } = useBookmarks();
  const { recent, addRecent, clearRecent } = useRecentlyViewed();

  const chunkRefs = useRef({});
  const parentRef = useRef(null);
  const scrollPosRef = useRef(0);
  const mainContentRef = useRef(null);

  // ==========================================
  // STUDENT QUERY
  // ==========================================
  const { 
    data: student, 
    isLoading: studentLoading, 
    error: studentError,
    refetch: refetchStudent,
  } = useQuery({
    queryKey: ['student', userData?.user_id],
    queryFn: () => fetchStudent(userData?.user_id),
    enabled: !!userData?.user_id,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.status === 429) return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // FIXED: Only auto-select the student's class ONCE on initial load
  useEffect(() => {
    if (student?.class_id && !hasInitializedClass) {
      setSelectedClass(student.class_id);
      setHasInitializedClass(true);
    }
  }, [student, hasInitializedClass]);

  // ==========================================
  // METADATA QUERY
  // ==========================================
  const { 
    data: metadata, 
    isLoading: metadataLoading, 
    error: metadataError 
  } = useQuery({
    queryKey: ['schoolMetadata', student?.school_id],
    queryFn: () => fetchSchoolMetadata(student.school_id, student?.proprietor || student?.school_id),
    enabled: !!student?.school_id,
    staleTime: 10 * 60 * 1000,
  });

  const classes = metadata?.classes || [];
  const subjects = metadata?.subjects || [];
  const classSubjects = metadata?.classSubjects || [];

  // ==========================================
  // NOTES INFINITE QUERY
  // ==========================================
  const {
    data: notesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: notesLoading,
    isFetching,
    error: notesError,
    refetch: refetchNotes,
  } = useInfiniteQuery({
    queryKey: ['notes', student?.school_id, selectedClass, selectedSubject, debouncedSearch],
    queryFn: ({ pageParam = 0 }) => 
      fetchNotesPage({ pageParam, student, selectedClass, selectedSubject, debouncedSearch }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!student?.school_id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      if (error?.isRateLimit) return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  useEffect(() => {
    if (isFetching && !isFetchingNextPage && notesData) {
      setShowStaleBanner(true);
    }
  }, [isFetching, isFetchingNextPage, notesData]);

  const allNotes = useMemo(() => {
    return notesData?.pages.flatMap(page => page.notes) || [];
  }, [notesData]);

  const totalCount = notesData?.pages[0]?.total || 0;

  const notesWithProgress = useMemo(() => {
    return allNotes.map(note => {
      const progress = storage.get(`${READING_PROGRESS_KEY}_${note.id}`, { progress: 0 });
      return { ...note, reading_progress: progress.progress };
    });
  }, [allNotes]);

  // ==========================================
  // VIRTUALIZED GRID
  // ==========================================
  const virtualizer = useVirtualizer({
    count: notesWithProgress.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180,
    overscan: 5,
  });

  // ==========================================
  // INFINITE SCROLL TRIGGER
  // ==========================================
  const lastItemRef = useCallback((node) => {
    if (isFetchingNextPage) return;
    if (node && hasNextPage) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            fetchNextPage();
          }
        },
        { threshold: 0.1, rootMargin: '200px' }
      );
      observer.observe(node);
      return () => observer.disconnect();
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  // ==========================================
  // DERIVED: Available subjects
  // ==========================================
  const availableSubjects = useMemo(() => {
    if (!selectedClass) return [];
    const linkedIds = classSubjects
      .filter(cs => cs.class_id === selectedClass)
      .map(cs => cs.subject_id);
    return subjects.filter(s => linkedIds.includes(s.id));
  }, [selectedClass, classSubjects, subjects]);

  // ==========================================
  // CHUNKS QUERY
  // ==========================================
  const { 
    data: noteChunks, 
    isLoading: chunksLoading,
    error: chunksError,
  } = useQuery({
    queryKey: ['noteChunks', selectedNote?.id],
    queryFn: () => fetchNoteChunks(selectedNote.id),
    enabled: !!selectedNote?.id,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.status === 429) return false;
      return failureCount < 3;
    },
  });

  const sortedChunks = useMemo(() => noteChunks || [], [noteChunks]);
  const chunkIds = useMemo(() => sortedChunks.map(c => c.chunk_id), [sortedChunks]);

  // ==========================================
  // READING PROGRESS (WITH RESET)
  // ==========================================
  const { 
    progress, 
    completedSections, 
    markSectionComplete, 
    unmarkSection, 
    resetNoteProgress 
  } = useReadingProgress(selectedNote?.id, chunkIds);

  // ==========================================
  // ACTIVE SECTION TRACKING
  // ==========================================
  const activeSectionId = useActiveSection(
    sortedChunks.map(c => `chunk-${c.chunk_id}`)
  );

  // ==========================================
  // SCROLL POSITION SAVE/RESTORE
  // ==========================================
  const saveScrollPosition = useCallback(() => {
    if (parentRef.current) {
      scrollPosRef.current = parentRef.current.scrollTop;
      sessionStorage.setItem(SCROLL_RESTORE_KEY, String(scrollPosRef.current));
    }
  }, []);

  const restoreScrollPosition = useCallback(() => {
    const saved = sessionStorage.getItem(SCROLL_RESTORE_KEY);
    if (saved && parentRef.current) {
      parentRef.current.scrollTop = parseInt(saved, 10);
      sessionStorage.removeItem(SCROLL_RESTORE_KEY);
    }
  }, []);

  useLayoutEffect(() => {
    if (activeView === 'notes') {
      restoreScrollPosition();
    }
  }, [activeView, restoreScrollPosition]);

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleNoteClick = useCallback((note) => {
    saveScrollPosition();
    setSelectedNote(note);
    setActiveView('reader');
    setTocOpen(true);
    addRecent(note);
    window.scrollTo(0, 0);
  }, [saveScrollPosition, addRecent]);

  const handleBack = useCallback(() => {
    setSelectedNote(null);
    setActiveView('notes');
    setTocOpen(false);
    setRenderErrors(new Map());
    setConfirmResetNote(false);
  }, []);

  const scrollToSection = useCallback((chunkId) => {
    const element = document.getElementById(`chunk-${chunkId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // FIXED: Allow "All Classes" (null) to actually show all classes
  const handleSelectClass = useCallback((id) => {
    setSelectedClass(id); // id is null when "All Classes" is selected
    setSelectedSubject(null);
  }, []);

  const handleSelectSubject = useCallback((id) => {
    setSelectedSubject(id);
  }, []);

  const handleRefresh = useCallback(() => {
    setShowStaleBanner(false);
    queryClient.invalidateQueries({ queryKey: ['notes'] });
    refetchNotes();
  }, [queryClient, refetchNotes]);

  const handleChunkRenderError = useCallback((chunkId, error) => {
    setRenderErrors(prev => new Map(prev).set(chunkId, error.message));
  }, []);

  // Reset handlers with confirmation
  const handleResetNote = useCallback(() => {
    resetNoteProgress();
    setConfirmResetNote(false);
    setShowResetSuccess(true);
    setTimeout(() => setShowResetSuccess(false), 2000);
  }, [resetNoteProgress]);

  const handleResetAll = useCallback(() => {
    resetAllProgress();
    setConfirmResetAll(false);
    setShowSettings(false);
    setShowResetSuccess(true);
    setTimeout(() => setShowResetSuccess(false), 2000);
    queryClient.invalidateQueries({ queryKey: ['notes'] });
  }, [queryClient]);

  const handleClearRecent = useCallback(() => {
    clearRecent();
    setConfirmClearRecent(false);
  }, [clearRecent]);

  // ==========================================
  // RENDER: LOADING STATE
  // ==========================================
  if (studentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-blue-600 mx-auto mb-4" />
          <p className="text-sm text-slate-500">Loading your notes...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 flex-col gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-slate-500">Student not found</p>
        {studentError && (
          <div className="text-center">
            <pre className="text-xs text-red-500 bg-red-50 p-4 rounded-lg max-w-md overflow-auto text-left">
              {JSON.stringify(studentError, null, 2)}
            </pre>
            <button 
              onClick={() => refetchStudent()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER: RATE LIMIT ERROR
  // ==========================================
  if (notesError?.isRateLimit) {
    return (
      <div className="min-h-screen bg-slate-50">
        <RateLimitError 
          retryAfter={notesError.retryAfter || 60} 
          onRetry={() => refetchNotes()} 
        />
      </div>
    );
  }

  // ==========================================
  // RENDER: NOTES LIST
  // ==========================================
  if (activeView === 'notes') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Success Toast */}
        {showResetSuccess && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Progress reset successfully</span>
          </div>
        )}

        {/* Offline Banner */}
        {!isOnline && !dismissedOffline && (
          <OfflineBanner onDismiss={() => setDismissedOffline(true)} />
        )}

        {/* Stale Content Banner */}
        {showStaleBanner && (
          <StaleContentBanner onRefresh={handleRefresh} />
        )}

        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-900 leading-tight">EduNotes</h1>
                <p className="text-xs text-slate-500">{student.school_name || 'No School'}</p>
              </div>
            </div>

            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search notes by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-slate-100 border-0 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                {(notesLoading || isFetching) && !isFetchingNextPage && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                )}
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <School className="w-3.5 h-3.5" />
                <span>{totalCount} notes</span>
              </div>
              {bookmarks.length > 0 && (
                <div className="flex items-center gap-1 text-amber-600">
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span>{bookmarks.length}</span>
                </div>
              )}
              <button
                onClick={() => setShowSettings(true)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                title="Progress settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="max-w-6xl mx-auto px-4 py-4 w-full">
          {metadataLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading filters...
            </div>
          ) : metadataError ? (
            <div className="text-sm text-red-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Error loading filters: {metadataError.message}
            </div>
          ) : (
            <ClassSubjectSelector
              classes={classes}
              subjects={availableSubjects}
              selectedClass={selectedClass}
              selectedSubject={selectedSubject}
              onSelectClass={handleSelectClass}
              onSelectSubject={handleSelectSubject}
              disabled={notesLoading}
            />
          )}
        </div>

        {/* Recently Viewed */}
        <RecentlyViewedStrip 
          recent={recent} 
          onNoteClick={handleNoteClick}
          onClear={() => setConfirmClearRecent(true)}
        />

        {/* Virtualized Notes Grid */}
        <div ref={parentRef} className="flex-1 overflow-auto max-w-6xl mx-auto px-4 pb-12 w-full">
          {notesLoading && !notesData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[180px]">
                  <NoteCardSkeleton />
                </div>
              ))}
            </div>
          ) : notesError ? (
            <div className="text-center py-20">
              <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">Failed to load notes</p>
              <button 
                onClick={() => refetchNotes()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : notesWithProgress.length > 0 ? (
            <div 
              className="relative w-full"
              style={{ height: `${virtualizer.getTotalSize()}px` }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const note = notesWithProgress[virtualItem.index];
                const isLastItem = virtualItem.index === notesWithProgress.length - 1;

                return (
                  <div
                    key={virtualItem.key}
                    ref={isLastItem ? lastItemRef : undefined}
                    className="absolute top-0 left-0 w-full px-2"
                    style={{
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <div className="h-full py-2">
                      <NoteCard 
                        note={note} 
                        subject={subjects.find(s => s.id === note.subject_id)}
                        onClick={() => handleNoteClick(note)}
                        isBookmarked={isBookmarked(note.id)}
                        onToggleBookmark={toggleBookmark}
                      />
                    </div>
                  </div>
                );
              })}

              {isFetchingNextPage && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-2">
                {debouncedSearch ? `No notes found for "${debouncedSearch}"` : 'No notes found'}
              </p>
              {debouncedSearch && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>

        {/* Settings Modal */}
        <ProgressSettingsPanel 
          isOpen={showSettings} 
          onClose={() => setShowSettings(false)}
          onResetAll={() => setConfirmResetAll(true)}
        />

        {/* Confirm Reset All */}
        <ConfirmModal
          isOpen={confirmResetAll}
          title="Reset All Progress?"
          message="This will erase all reading progress across every note. This action cannot be undone."
          confirmText="Reset Everything"
          confirmVariant="danger"
          onConfirm={handleResetAll}
          onCancel={() => setConfirmResetAll(false)}
        />

        {/* Confirm Clear Recent */}
        <ConfirmModal
          isOpen={confirmClearRecent}
          title="Clear Recent History?"
          message="This will remove all notes from your recently viewed list."
          confirmText="Clear History"
          confirmVariant="danger"
          onConfirm={handleClearRecent}
          onCancel={() => setConfirmClearRecent(false)}
        />
      </div>
    );
  }

  // ==========================================
  // RENDER: READER
  // ==========================================
  return (
    <div className="min-h-screen bg-white flex">
      {/* Success Toast */}
      {showResetSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm font-medium">Progress reset successfully</span>
        </div>
      )}

      {/* Reading Progress Bar */}
      {progress > 0 && <ReadingProgressBar progress={progress} />}

      {/* Left Drawer: Table of Contents */}
      <aside className={cn(
        "fixed left-0 top-0 z-40 h-full bg-slate-50 border-r border-slate-200 transition-all duration-300 ease-in-out overflow-hidden flex flex-col",
        tocOpen ? "w-72" : "w-0 opacity-0"
      )}>
        <div className="w-72 h-full flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2">
              <List className="w-4 h-4" />
              Contents
            </h3>
            <button onClick={() => setTocOpen(false)} className="p-1 hover:bg-slate-200 rounded">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Reading Progress in TOC */}
          {progress > 0 && (
            <div className="px-4 py-3 border-b border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Reading progress</span>
                <span className="font-medium text-blue-600">{progress}%</span>
              </div>
              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3">
            {chunksLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              </div>
            ) : chunksError ? (
              <div className="p-3 text-sm text-red-500 text-center">
                <AlertCircle className="w-5 h-5 mx-auto mb-2" />
                Failed to load contents
              </div>
            ) : (
              <ul className="space-y-1">
                {sortedChunks.map((chunk) => {
                  const isActive = activeSectionId === `chunk-${chunk.chunk_id}`;
                  const isCompleted = completedSections.has(chunk.chunk_id);

                  return (
                    <li key={chunk.chunk_id}>
                      <button
                        onClick={() => scrollToSection(chunk.chunk_id)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2",
                          isActive 
                            ? "bg-white text-blue-600 shadow-sm font-medium" 
                            : "text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-sm",
                          isCompleted && !isActive && "text-slate-400"
                        )}
                      >
                        <span className={cn(
                          "inline-flex items-center justify-center w-6 h-6 rounded text-xs font-mono shrink-0",
                          isActive ? "bg-blue-100 text-blue-700" : "text-slate-400",
                          isCompleted && !isActive && "bg-green-100 text-green-600"
                        )}>
                          {isCompleted && !isActive ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            chunk.order_index || chunk.level || 1
                          )}
                        </span>
                        <span className="line-clamp-1">{chunk.title || 'Untitled'}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* TOC Footer: Reset Note Progress */}
          <div className="p-3 border-t border-slate-200">
            <button
              onClick={() => setConfirmResetNote(true)}
              disabled={progress === 0}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset This Note
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        ref={mainContentRef}
        className={cn(
          "flex-1 min-w-0 transition-all duration-300 overflow-y-auto",
          tocOpen ? "ml-72" : "ml-0"
        )}
      >
        {/* Reader Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <button 
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-slate-900 truncate">
                {selectedNote.title}
              </h1>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {subjects.find(s => s.id === selectedNote.subject_id)?.subject_name || "General"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => toggleBookmark(selectedNote)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isBookmarked(selectedNote.id) 
                    ? "text-amber-500 bg-amber-50" 
                    : "text-slate-500 hover:bg-slate-100"
                )}
                title={isBookmarked(selectedNote.id) ? "Remove bookmark" : "Bookmark this note"}
              >
                {isBookmarked(selectedNote.id) ? (
                  <BookmarkCheck className="w-4 h-4" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setTocOpen(!tocOpen)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  tocOpen ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-100"
                )}
                title="Toggle contents"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Note Content */}
        <div className="max-w-3xl mx-auto px-6 py-8">
          {chunksLoading ? (
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <ChunkSkeleton key={i} />
              ))}
            </div>
          ) : chunksError ? (
            <div className="text-center py-20">
              <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">Failed to load note content</p>
              <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['noteChunks', selectedNote.id] })}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : (
            <article>
              {sortedChunks.map((chunk) => (
                <div 
                  key={chunk.chunk_id} 
                  id={`chunk-${chunk.chunk_id}`}
                  ref={el => { chunkRefs.current[chunk.chunk_id] = el; }}
                  className="mb-10 last:mb-0 scroll-mt-20"
                >
                  <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                    <span className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold",
                      completedSections.has(chunk.chunk_id)
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    )}>
                      {completedSections.has(chunk.chunk_id) ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        chunk.order_index || chunk.level || 1
                      )}
                    </span>
                    {chunk.title || 'Untitled Section'}
                  </h2>

                  {renderErrors.has(chunk.chunk_id) ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-700 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>This section failed to render. The content may be corrupted.</span>
                      </div>
                    </div>
                  ) : (
                    <ContentRenderer 
                      bodyJson={chunk.body} 
                      onRenderError={(err) => handleChunkRenderError(chunk.chunk_id, err)}
                    />
                  )}

                  {/* Mark/Unmark Section */}
                  <div className="mt-4 flex items-center gap-3">
                    {completedSections.has(chunk.chunk_id) ? (
                      <button
                        onClick={() => unmarkSection(chunk.chunk_id)}
                        className="text-xs text-green-600 hover:text-red-500 flex items-center gap-1 transition-colors"
                      >
                        <EyeOff className="w-3 h-3" />
                        Unmark as read
                      </button>
                    ) : (
                      <button
                        onClick={() => markSectionComplete(chunk.chunk_id)}
                        className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </article>
          )}
        </div>
      </main>

      {/* Confirm Reset Note */}
      <ConfirmModal
        isOpen={confirmResetNote}
        title="Reset This Note?"
        message={`This will erase all reading progress for "${selectedNote?.title}". This action cannot be undone.`}
        confirmText="Reset Progress"
        confirmVariant="danger"
        onConfirm={handleResetNote}
        onCancel={() => setConfirmResetNote(false)}
      />
    </div>
  );
}
