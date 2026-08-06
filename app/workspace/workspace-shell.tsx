"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { navItems, tabs } from "./constants";
import { ApplicationMethodDialog, NewJobDialog } from "./panels";
import { useWorkspace } from "./workspace-context";

export function WorkspaceShell({
  children,
  breadcrumbLabel,
}: {
  children: ReactNode;
  breadcrumbLabel: string;
}) {
  const pathname = usePathname();
  const {
    jobRecords,
    newJobOpen,
    setNewJobOpen,
    submittingJobId,
    setSubmittingJobId,
    toast,
    showToast,
    session,
    addJob,
    updateJobStatus,
  } = useWorkspace();

  const onJobs = pathname === "/jobs" || pathname.startsWith("/jobs/");
  const onResumes = pathname === "/resumes" || pathname.startsWith("/resumes/");
  const activeJobId = pathname.startsWith("/jobs/") && pathname !== "/jobs"
    ? decodeURIComponent(pathname.slice("/jobs/".length).split("/")[0] ?? "")
    : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">向</div>
          <div>
            <strong>向前</strong>
            <span>求职工作台</span>
          </div>
        </div>

        <nav className="main-nav" aria-label="主导航">
          {navItems.map((item) => {
            if (item.label === "岗位管理") {
              return (
                <Link
                  key={item.label}
                  href="/jobs"
                  className={onJobs ? "nav-item active" : "nav-item"}
                >
                  <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                </Link>
              );
            }
            if (item.label === "简历中心") {
              return (
                <Link
                  key={item.label}
                  href="/resumes"
                  className={onResumes ? "nav-item active" : "nav-item"}
                >
                  <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            }
            return (
              <button
                className="nav-item"
                key={item.label}
                type="button"
                onClick={() => showToast(`${item.label}将在后续版本开放`)}
              >
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-section">
          <div className="section-label">
            <span>最近岗位</span>
            <button type="button" aria-label="添加岗位" onClick={() => setNewJobOpen(true)}>＋</button>
          </div>
          <div className="recent-jobs">
            {jobRecords.slice(0, 3).map((job) => (
              <Link
                className={activeJobId === job.id ? "recent-job selected" : "recent-job"}
                key={job.id}
                href={`/jobs/${job.id}`}
              >
                <span className={`mini-logo ${job.tone}`}>{job.mark}</span>
                <span className="recent-copy">
                  <strong>{job.title}</strong>
                  <small>{job.status}</small>
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="avatar">{session.email?.slice(0, 1).toUpperCase() || "访"}</div>
          <div>
            <strong>{session.authenticated ? "ChatGPT 已登录" : "尚未登录"}</strong>
            <span title={session.email || undefined}>{session.email || "登录后可使用 AI"}</span>
          </div>
          <button
            className="account-switch-button"
            type="button"
            aria-label={session.authenticated ? "退出并切换 ChatGPT 账号" : "登录 ChatGPT"}
            title={session.authenticated ? "退出并切换 ChatGPT 账号" : "登录 ChatGPT"}
            onClick={() => window.location.assign(session.authenticated ? session.signOutPath : session.signInPath)}
          >
            {session.authenticated ? "切换" : "登录"}
          </button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <Link href="/jobs">岗位管理</Link><b>/</b><strong>{breadcrumbLabel}</strong>
          </div>
          <div className="top-actions">
            <button className="icon-button" type="button" aria-label="搜索">⌕</button>
            <button className="icon-button notification" type="button" aria-label="通知">○<i /></button>
            <button className="primary-button compact" type="button" onClick={() => setNewJobOpen(true)}>＋ 新建岗位</button>
          </div>
        </header>

        {children}
      </main>

      {newJobOpen && <NewJobDialog onClose={() => setNewJobOpen(false)} onCreate={addJob} />}
      {submittingJobId && (
        <ApplicationMethodDialog
          job={jobRecords.find((job) => job.id === submittingJobId) ?? jobRecords[0]}
          onClose={() => setSubmittingJobId(null)}
          onConfirm={(method) => {
            updateJobStatus(submittingJobId, "已投递", method);
            setSubmittingJobId(null);
            showToast("已标记为已投递，并记录投递方式");
          }}
        />
      )}
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </div>
  );
}

export function tabLabel(tabId: string | null | undefined) {
  return tabs.find((tab) => tab.id === tabId)?.label ?? "岗位概览";
}
