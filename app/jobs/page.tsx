"use client";

import { Suspense } from "react";
import { JobsPageView } from "../workspace/page-views";

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="workspace-body"><div className="empty-list"><strong>加载中…</strong></div></div>}>
      <JobsPageView />
    </Suspense>
  );
}
