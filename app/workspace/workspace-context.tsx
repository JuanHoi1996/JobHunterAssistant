"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { normalizeStoredResumeAnalysis } from "../resume-analysis.js";
import {
  clearResumeTemplates,
  hasResumeTemplate,
  LEGACY_MASTER_TEMPLATE_ID,
} from "../resume-template";
import { initialJobs, LOCAL_KEYS, resumeAnalysisKey } from "./constants";
import type {
  JobRecord,
  JobStatus,
  ResumeAnalysis,
  ResumeSource,
  ResumeVersion,
  SessionState,
} from "./types";

type WorkspaceContextValue = {
  storageReady: boolean;
  jobRecords: JobRecord[];
  setJobRecords: React.Dispatch<React.SetStateAction<JobRecord[]>>;
  filter: string;
  setFilter: React.Dispatch<React.SetStateAction<string>>;
  newJobOpen: boolean;
  setNewJobOpen: React.Dispatch<React.SetStateAction<boolean>>;
  submittingJobId: string | null;
  setSubmittingJobId: React.Dispatch<React.SetStateAction<string | null>>;
  reminderDismissed: boolean;
  setReminderDismissed: React.Dispatch<React.SetStateAction<boolean>>;
  toast: string;
  showToast: (message: string) => void;
  resumes: ResumeSource[];
  setResumes: React.Dispatch<React.SetStateAction<ResumeSource[]>>;
  resumeSelections: Record<string, string>;
  setResumeSelections: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  templateResumeIds: string[];
  setTemplateResumeIds: React.Dispatch<React.SetStateAction<string[]>>;
  resumeAnalyses: Record<string, ResumeAnalysis>;
  setResumeAnalyses: React.Dispatch<React.SetStateAction<Record<string, ResumeAnalysis>>>;
  resumeVersions: ResumeVersion[];
  setResumeVersions: React.Dispatch<React.SetStateAction<ResumeVersion[]>>;
  session: SessionState;
  filteredJobs: JobRecord[];
  overdueJobs: JobRecord[];
  addJob: (job: JobRecord) => void;
  updateJobStatus: (jobId: string, status: JobStatus, applicationMethod?: string) => void;
  saveResumeVersion: (
    job: JobRecord,
    sourceResume: ResumeSource,
    analysis: ResumeAnalysis,
    content: string,
  ) => void;
  clearLocalResumeData: () => void;
  getJobAnalysis: (jobId: string) => ResumeAnalysis | undefined;
  getSelectedResumeId: (jobId: string) => string;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return value;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [jobRecords, setJobRecords] = useState<JobRecord[]>(initialJobs);
  const [filter, setFilter] = useState("全部");
  const [newJobOpen, setNewJobOpen] = useState(false);
  const [submittingJobId, setSubmittingJobId] = useState<string | null>(null);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [toast, setToast] = useState("");
  const [resumes, setResumes] = useState<ResumeSource[]>([]);
  const [resumeSelections, setResumeSelections] = useState<Record<string, string>>({});
  const [templateResumeIds, setTemplateResumeIds] = useState<string[]>([]);
  const [resumeAnalyses, setResumeAnalyses] = useState<Record<string, ResumeAnalysis>>({});
  const [resumeVersions, setResumeVersions] = useState<ResumeVersion[]>([]);
  const [session, setSession] = useState<SessionState>({
    authenticated: false,
    email: null,
    signInPath: "/signin-with-chatgpt?return_to=%2Fjobs",
    signOutPath: "/signout-with-chatgpt?return_to=%2Fjobs",
  });
  const [storageReady, setStorageReady] = useState(false);
  const [pendingReturnPath, setPendingReturnPath] = useState<string | null>(null);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const storedJobs = window.localStorage.getItem(LOCAL_KEYS.jobs);
        const storedResumes = window.localStorage.getItem(LOCAL_KEYS.resumes);
        const storedSelections = window.localStorage.getItem(LOCAL_KEYS.resumeSelections);
        const storedAnalyses = window.localStorage.getItem(LOCAL_KEYS.analyses);
        const storedVersions = window.localStorage.getItem(LOCAL_KEYS.versions);
        const returnJobId = window.localStorage.getItem(LOCAL_KEYS.returnJob);
        const restoredJobs = storedJobs ? JSON.parse(storedJobs) as JobRecord[] : initialJobs;
        if (Array.isArray(restoredJobs) && restoredJobs.length) setJobRecords(restoredJobs);
        if (storedResumes) {
          const restoredResumes = JSON.parse(storedResumes) as ResumeSource[];
          if (Array.isArray(restoredResumes)) setResumes(restoredResumes);
        } else {
          const legacyContent = window.localStorage.getItem(LOCAL_KEYS.masterResume) ?? "";
          const legacyName = window.localStorage.getItem(LOCAL_KEYS.masterResumeName) ?? "主简历";
          if (legacyContent.trim()) {
            setResumes([{
              id: LEGACY_MASTER_TEMPLATE_ID,
              name: legacyName,
              content: legacyContent,
              createdAt: "已从旧版自动迁移",
            }]);
          }
        }
        if (storedSelections) setResumeSelections(JSON.parse(storedSelections) as Record<string, string>);
        if (storedAnalyses) {
          const parsedAnalyses = JSON.parse(storedAnalyses) as Record<string, unknown>;
          const restoredAnalyses = Object.fromEntries(
            Object.entries(parsedAnalyses).flatMap(([key, value]) => {
              const analysis = normalizeStoredResumeAnalysis(value) as ResumeAnalysis | undefined;
              return analysis ? [[key, analysis]] : [];
            }),
          );
          setResumeAnalyses(restoredAnalyses);
        }
        if (storedVersions) setResumeVersions(JSON.parse(storedVersions) as ResumeVersion[]);
        if (returnJobId && restoredJobs.some((job) => job.id === returnJobId)) {
          setPendingReturnPath(`/jobs/${returnJobId}?tab=resume`);
          window.localStorage.removeItem(LOCAL_KEYS.returnJob);
        }
      } catch {
        // Invalid local data is ignored; the user can continue with a clean draft.
      } finally {
        setStorageReady(true);
      }
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (!storageReady || !pendingReturnPath) return;
    router.replace(pendingReturnPath);
    setPendingReturnPath(null);
  }, [storageReady, pendingReturnPath, router]);

  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: SessionState) => setSession(payload))
      .catch(() => {
        // Account controls remain available with their safe default paths.
      });
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    Promise.all(resumes.map(async (resume) => (
      await hasResumeTemplate(resume.id) ? resume.id : null
    )))
      .then((ids) => setTemplateResumeIds(ids.filter((id): id is string => Boolean(id))))
      .catch(() => setTemplateResumeIds([]));
  }, [resumes, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(LOCAL_KEYS.jobs, JSON.stringify(jobRecords));
    window.localStorage.setItem(LOCAL_KEYS.resumes, JSON.stringify(resumes));
    window.localStorage.setItem(LOCAL_KEYS.resumeSelections, JSON.stringify(resumeSelections));
    window.localStorage.setItem(LOCAL_KEYS.analyses, JSON.stringify(resumeAnalyses));
    window.localStorage.setItem(LOCAL_KEYS.versions, JSON.stringify(resumeVersions));
  }, [jobRecords, resumes, resumeSelections, resumeAnalyses, resumeVersions, storageReady]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }, []);

  const overdueJobs = jobRecords.filter((job) => job.status === "待投递" && job.ageHours >= 24);
  const filteredJobs = useMemo(
    () => (filter === "全部" ? jobRecords : jobRecords.filter((job) => job.status === filter)),
    [filter, jobRecords],
  );

  const updateJobStatus = useCallback((jobId: string, status: JobStatus, applicationMethod?: string) => {
    setJobRecords((current) => current.map((job) => (
      job.id === jobId ? { ...job, status, applicationMethod: applicationMethod ?? job.applicationMethod } : job
    )));
  }, []);

  const addJob = useCallback((job: JobRecord) => {
    setJobRecords((current) => [job, ...current]);
    setFilter("全部");
    setNewJobOpen(false);
    showToast("岗位已收录，并自动标记为待投递");
  }, [showToast]);

  const saveResumeVersion = useCallback((
    job: JobRecord,
    sourceResume: ResumeSource,
    analysis: ResumeAnalysis,
    content: string,
  ) => {
    setResumeVersions((current) => {
      const versionNumber = current.filter((version) => version.jobId === job.id).length + 1;
      const version: ResumeVersion = {
        id: `resume-${job.id}-${Date.now()}`,
        jobId: job.id,
        sourceResumeId: sourceResume.id,
        sourceResumeName: sourceResume.name,
        company: job.company,
        jobTitle: job.title,
        name: `${job.company} · ${job.title} V${versionNumber}`,
        content,
        acceptedCount: analysis.accepted.length,
        createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      };
      showToast(`岗位专属简历 V${versionNumber} 已保存在当前浏览器`);
      setJobRecords((jobs) => jobs.map((item) => (
        item.id === job.id ? { ...item, materials: `岗位专属简历 V${versionNumber}` } : item
      )));
      return [version, ...current];
    });
  }, [showToast]);

  const clearLocalResumeData = useCallback(() => {
    setResumes([]);
    setResumeSelections({});
    setTemplateResumeIds([]);
    setResumeAnalyses({});
    setResumeVersions([]);
    void clearResumeTemplates();
    showToast("本地简历与岗位专属版本已清除");
  }, [showToast]);

  const getSelectedResumeId = useCallback((jobId: string) => (
    resumeSelections[jobId] ?? resumes[0]?.id ?? ""
  ), [resumeSelections, resumes]);

  const getJobAnalysis = useCallback((jobId: string) => {
    const resumeId = getSelectedResumeId(jobId);
    return normalizeStoredResumeAnalysis(
      resumeAnalyses[resumeAnalysisKey(jobId, resumeId)],
    ) as ResumeAnalysis | undefined;
  }, [getSelectedResumeId, resumeAnalyses]);

  const value = useMemo<WorkspaceContextValue>(() => ({
    storageReady,
    jobRecords,
    setJobRecords,
    filter,
    setFilter,
    newJobOpen,
    setNewJobOpen,
    submittingJobId,
    setSubmittingJobId,
    reminderDismissed,
    setReminderDismissed,
    toast,
    showToast,
    resumes,
    setResumes,
    resumeSelections,
    setResumeSelections,
    templateResumeIds,
    setTemplateResumeIds,
    resumeAnalyses,
    setResumeAnalyses,
    resumeVersions,
    setResumeVersions,
    session,
    filteredJobs,
    overdueJobs,
    addJob,
    updateJobStatus,
    saveResumeVersion,
    clearLocalResumeData,
    getJobAnalysis,
    getSelectedResumeId,
  }), [
    storageReady,
    jobRecords,
    filter,
    newJobOpen,
    submittingJobId,
    reminderDismissed,
    toast,
    showToast,
    resumes,
    resumeSelections,
    templateResumeIds,
    resumeAnalyses,
    resumeVersions,
    session,
    filteredJobs,
    overdueJobs,
    addJob,
    updateJobStatus,
    saveResumeVersion,
    clearLocalResumeData,
    getJobAnalysis,
    getSelectedResumeId,
  ]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
