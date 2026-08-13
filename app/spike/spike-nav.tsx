"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/spike", label: "简历编排" },
  { href: "/spike/rank", label: "岗位排序" },
] as const;

export function SpikeNav() {
  const pathname = usePathname() || "";
  return (
    <nav className="spike-subnav" aria-label="测床功能">
      {items.map((item) => {
        const active = item.href === "/spike"
          ? pathname === "/spike"
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "spike-subnav-link is-active" : "spike-subnav-link"}
          >
            {item.label}
          </Link>
        );
      })}
      <Link className="spike-subnav-link spike-subnav-external" href="/jobs">主工作台</Link>
    </nav>
  );
}
