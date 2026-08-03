"use client";

import { Suspense, use } from "react";
import { JobWorkspacePageView } from "../../workspace/page-views";

export default function JobWorkspacePage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  return (
    <Suspense fallback={<div className="workspace-body"><div className="empty-list"><strong>加载中…</strong></div></div>}>
      <JobWorkspacePageView jobId={jobId} />
    </Suspense>
  );
}
