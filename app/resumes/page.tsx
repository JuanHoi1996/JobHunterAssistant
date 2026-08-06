"use client";

import { Suspense } from "react";
import { ResumesPageView } from "../workspace/page-views";

export default function ResumesPage() {
  return (
    <Suspense fallback={<div className="workspace-body"><div className="empty-list"><strong>加载中…</strong></div></div>}>
      <ResumesPageView />
    </Suspense>
  );
}
