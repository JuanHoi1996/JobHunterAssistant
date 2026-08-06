"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { JobDetailView } from "./job-detail-view";
import { JobList, ResumeCenter } from "./panels";
import { useWorkspace } from "./workspace-context";
import { tabLabel, WorkspaceShell } from "./workspace-shell";

export function JobsPageView() {
  const {
    jobRecords,
    filteredJobs,
    overdueJobs,
    filter,
    setFilter,
    reminderDismissed,
    setReminderDismissed,
    setNewJobOpen,
    setSubmittingJobId,
  } = useWorkspace();

  return (
    <WorkspaceShell breadcrumbLabel="岗位列表">
      <JobList
        jobs={filteredJobs}
        allJobs={jobRecords}
        overdueJobs={overdueJobs}
        filter={filter}
        reminderDismissed={reminderDismissed}
        onFilter={setFilter}
        onDismissReminder={() => setReminderDismissed(true)}
        onNew={() => setNewJobOpen(true)}
        onMarkSubmitted={setSubmittingJobId}
      />
    </WorkspaceShell>
  );
}

export function ResumesPageView() {
  const router = useRouter();
  const {
    resumes,
    setResumes,
    templateResumeIds,
    setTemplateResumeIds,
    setResumeAnalyses,
    resumeVersions,
    showToast,
    clearLocalResumeData,
  } = useWorkspace();

  return (
    <WorkspaceShell breadcrumbLabel="简历中心">
      <ResumeCenter
        resumes={resumes}
        templateResumeIds={templateResumeIds}
        versions={resumeVersions}
        onResumeChange={(resumeId, value) => {
          setResumes((current) => current.map((resume) => (
            resume.id === resumeId ? { ...resume, content: value } : resume
          )));
          setResumeAnalyses({});
        }}
        onResumeImport={(resume) => {
          setResumes((current) => [...current, resume]);
          setTemplateResumeIds((current) => [...new Set([...current, resume.id])]);
          setResumeAnalyses({});
          showToast(`${resume.name} 已加入简历中心`);
        }}
        onOpenJob={(jobId) => {
          router.push(`/jobs/${jobId}?tab=resume`);
        }}
        onClear={clearLocalResumeData}
        onAction={showToast}
      />
    </WorkspaceShell>
  );
}

export function JobWorkspacePageView({ jobId }: { jobId: string }) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const { jobRecords, storageReady } = useWorkspace();
  const job = jobRecords.find((item) => item.id === jobId);
  const breadcrumbLabel = !storageReady
    ? "岗位工作区"
    : !job
      ? "未找到岗位"
      : tabLabel(tab);

  return (
    <WorkspaceShell breadcrumbLabel={breadcrumbLabel}>
      <JobDetailView jobId={jobId} />
    </WorkspaceShell>
  );
}
