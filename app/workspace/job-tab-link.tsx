"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode, MouseEvent } from "react";
import { shouldInterceptClientNavigation } from "./navigation";
import type { TabId } from "./types";

export function jobTabHref(jobId: string, tab: TabId) {
  return tab === "overview" ? `/jobs/${jobId}` : `/jobs/${jobId}?tab=${tab}`;
}

/**
 * Tab navigation that stays a real link (new-tab / Cmd-click work),
 * while plain left-click uses replace to avoid stacking tab history.
 */
export function JobTabLink({
  jobId,
  tab,
  className,
  children,
}: {
  jobId: string;
  tab: TabId;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const href = jobTabHref(jobId, tab);

  return (
    <Link
      href={href}
      className={className}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        if (!shouldInterceptClientNavigation(event)) return;
        event.preventDefault();
        router.replace(href);
      }}
    >
      {children}
    </Link>
  );
}
