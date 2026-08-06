"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizeStoredResumeAnalysis } from "../resume-analysis.js";
import { resumeAnalysisKey, tabs } from "./constants";
import { shouldInterceptClientNavigation } from "./navigation";
import {
  InterviewPanel,
  LetterPanel,
  Overview,
  ProgressPanel,
  ResumePanel,
} from "./panels";
import type { ResumeAnalysis, JobStatus, TabId } from "./types";
import { useWorkspace } from "./workspace-context";

const TAB_IDS: TabId[] = ["overview", "resume", "letter", "progress", "interview"];

function parseTab(value: string | null): TabId {
  return TAB_IDS.includes(value as TabId) ? (value as TabId) : "overview";
}

export function JobDetailView({ jobId }: { jobId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parseTab(searchParams.get("tab"));
  const {
    storageReady,
    jobRecords,
    resumes,
    setResumeSelections,
    templateResumeIds,
    resumeAnalyses,
    setResumeAnalyses,
    showToast,
    updateJobStatus,
    saveResumeVersion,
    getSelectedResumeId,
  } = useWorkspace();

  if (!storageReady) {
    return (
      <div className="workspace-body">
        <div className="empty-list"><strong>正在读取本地岗位数据…</strong></div>
      </div>
    );
  }

  const selectedJob = jobRecords.find((job) => job.id === jobId);
  if (!selectedJob) {
    return (
      <div className="workspace-body">
        <div className="resume-empty-state card">
          <span className="resume-empty-icon">岗</span>
          <h2>未找到该岗位</h2>
          <p>链接中的岗位 ID 在当前浏览器记录里不存在，可能已被删除或尚未同步。</p>
          <Link className="primary-button" href="/jobs">返回岗位列表</Link>
        </div>
      </div>
    );
  }

  const selectedResumeId = getSelectedResumeId(selectedJob.id);
  const selectedResume = resumes.find((resume) => resume.id === selectedResumeId);
  const selectedAnalysisKey = resumeAnalysisKey(selectedJob.id, selectedResumeId);
  const selectedAnalysis = normalizeStoredResumeAnalysis(
    resumeAnalyses[selectedAnalysisKey],
  ) as ResumeAnalysis | undefined;

  const setTab = (tab: TabId) => {
    const next = tab === "overview" ? `/jobs/${selectedJob.id}` : `/jobs/${selectedJob.id}?tab=${tab}`;
    router.replace(next);
  };

  return (
    <>
      <section className="job-hero">
        <div className={`company-logo ${selectedJob.tone}`}>{selectedJob.mark}</div>
        <div className="job-title-block">
          <div className="eyebrow-line">
            <span className="channel-pill">来自：{selectedJob.discoverySource}</span>
            <span>保存于 {selectedJob.savedLabel}</span>
          </div>
          <h1>{selectedJob.title}</h1>
          <div className="job-meta">
            <strong>{selectedJob.company}</strong><span>{selectedJob.location}</span><span>{selectedJob.employment}</span><span>{selectedJob.category}</span>
          </div>
        </div>
        <div className="hero-controls">
          <label className="status-select">
            <span className={`status-dot ${selectedJob.status === "已投递" ? "sent" : ""}`} />
            <select
              value={selectedJob.status}
              onChange={(event) => updateJobStatus(selectedJob.id, event.target.value as JobStatus)}
              aria-label="投递状态"
            >
              <option>待投递</option>
              <option>已投递</option>
              <option>面试中</option>
              <option>Offer</option>
              <option>已结束</option>
            </select>
          </label>
          <button className="more-button" type="button" aria-label="更多操作">•••</button>
        </div>
      </section>

      <div className="tab-bar" role="tablist" aria-label="岗位工作区">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.id === "overview" ? `/jobs/${selectedJob.id}` : `/jobs/${selectedJob.id}?tab=${tab.id}`}
            className={activeTab === tab.id ? "tab active" : "tab"}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={(event) => {
              // Plain left-click: replace history so tab switches do not stack.
              // Cmd/Ctrl/middle-click: keep native Link behavior for new tabs.
              if (!shouldInterceptClientNavigation(event)) return;
              event.preventDefault();
              setTab(tab.id);
            }}
          >
            {tab.label}
            {tab.count && <span>{tab.count}</span>}
          </Link>
        ))}
      </div>

      <div className="workspace-body">
        {activeTab === "overview" && (
          <Overview
            job={selectedJob}
            analysis={selectedAnalysis}
            onAction={showToast}
          />
        )}
        {activeTab === "resume" && (
          <ResumePanel
            key={`${selectedJob.id}-${selectedResumeId}`}
            job={selectedJob}
            resumes={resumes}
            selectedResumeId={selectedResumeId}
            templateReady={templateResumeIds.includes(selectedResumeId)}
            analysis={selectedAnalysis}
            onSelectResume={(resumeId) => setResumeSelections((current) => ({
              ...current,
              [selectedJob.id]: resumeId,
            }))}
            onAnalysis={(analysis) => {
              setResumeAnalyses((current) => ({ ...current, [selectedAnalysisKey]: analysis }));
            }}
            onResetAnalysis={() => setResumeAnalyses((current) => {
              const next = { ...current };
              delete next[selectedAnalysisKey];
              return next;
            })}
            onSaveVersion={(analysis, content) => {
              if (selectedResume) saveResumeVersion(selectedJob, selectedResume, analysis, content);
            }}
            onOpenResumeCenter={() => router.push("/resumes")}
            onAction={showToast}
          />
        )}
        {activeTab === "letter" && <LetterPanel onAction={showToast} />}
        {activeTab === "progress" && (
          <ProgressPanel
            status={selectedJob.status}
            setStatus={(nextStatus) => updateJobStatus(selectedJob.id, nextStatus as JobStatus)}
            onAction={showToast}
          />
        )}
        {activeTab === "interview" && <InterviewPanel onAction={showToast} />}
      </div>
    </>
  );
}
