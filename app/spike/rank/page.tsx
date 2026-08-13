"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { LOCAL_KEYS } from "../../workspace/constants";
import type { JobRecord } from "../../workspace/types";
import { persistSpikeRunLogFromBrowser, type SpikeRunLogBody } from "../run-log";
import {
  ELICITATION_SKILL_MARKDOWN,
  PREFERENCE_SKILL_STORAGE_KEY,
} from "../skill-texts";
import { SpikeNav } from "../spike-nav";

type RankJob = {
  id: string;
  company: string;
  title: string;
  rawJd: string;
  source: "library" | "temp";
};

type RankedRow = {
  jobId: string;
  gate: "pass" | "淘汰";
  gateReason: string;
  score: number | null;
  recommendation: string;
  topContributions: string[];
  topGaps: string[];
  note: string;
};

type RankAnalysis = {
  summary: string;
  ranked: RankedRow[];
  dimensions: {
    jobId: string;
    code: string;
    supply0to10: number;
    weight: number;
    contribution: number;
  }[];
};

type RankPayload = {
  analysis?: RankAnalysis;
  jobs?: RankJob[];
  error?: string;
  signInPath?: string;
  provider?: string;
  model?: string;
  pipelineVersion?: string;
  runLog?: SpikeRunLogBody;
};

const MAX_SELECTED = 6;

function readLibraryJobs(): RankJob[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEYS.jobs);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as JobRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((job) => {
      const rawJd = String(job.rawJd ?? "").trim();
      if (rawJd.length < 40) return [];
      return [{
        id: String(job.id),
        company: String(job.company || "未命名公司"),
        title: String(job.title || "未命名岗位"),
        rawJd,
        source: "library" as const,
      }];
    });
  } catch {
    return [];
  }
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function SpikeRankPage() {
  const [libraryJobs, setLibraryJobs] = useState<RankJob[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [preferenceSkill, setPreferenceSkill] = useState("");
  const [tempCompany, setTempCompany] = useState("");
  const [tempTitle, setTempTitle] = useState("");
  const [tempJd, setTempJd] = useState("");
  const [tempJobs, setTempJobs] = useState<RankJob[]>([]);
  const [showElicitation, setShowElicitation] = useState(false);
  const [isRanking, setIsRanking] = useState(false);
  const [error, setError] = useState("");
  const [signInPath, setSignInPath] = useState("");
  const [meta, setMeta] = useState("");
  const [logPath, setLogPath] = useState("");
  const [analysis, setAnalysis] = useState<RankAnalysis | null>(null);
  const [expandedId, setExpandedId] = useState("");
  const [skillMessage, setSkillMessage] = useState("");

  useEffect(() => {
    setLibraryJobs(readLibraryJobs());
    try {
      const saved = window.localStorage.getItem(PREFERENCE_SKILL_STORAGE_KEY);
      if (saved) setPreferenceSkill(saved);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      if (preferenceSkill.trim()) {
        window.localStorage.setItem(PREFERENCE_SKILL_STORAGE_KEY, preferenceSkill);
      }
    } catch {
      // ignore quota
    }
  }, [preferenceSkill]);

  const selectedLibrary = useMemo(
    () => libraryJobs.filter((job) => selectedIds.includes(job.id)),
    [libraryJobs, selectedIds],
  );

  const jobsForRank = useMemo(
    () => [...selectedLibrary, ...tempJobs].slice(0, MAX_SELECTED),
    [selectedLibrary, tempJobs],
  );

  const jobById = useMemo(() => {
    const map = new Map<string, RankJob>();
    for (const job of jobsForRank) map.set(job.id, job);
    return map;
  }, [jobsForRank]);

  const canRank = preferenceSkill.trim().length >= 200
    && jobsForRank.length >= 2
    && !isRanking;

  const toggleJob = (id: string) => {
    setSelectedIds((previous) => {
      if (previous.includes(id)) return previous.filter((item) => item !== id);
      if (previous.length + tempJobs.length >= MAX_SELECTED) return previous;
      return [...previous, id];
    });
  };

  const addTempJob = () => {
    const rawJd = tempJd.trim();
    const title = tempTitle.trim() || "临时岗位";
    if (rawJd.length < 40) {
      setError("临时 JD 至少 40 字。");
      return;
    }
    if (jobsForRank.length >= MAX_SELECTED) {
      setError(`最多对比 ${MAX_SELECTED} 个岗位。`);
      return;
    }
    const id = `temp-${Date.now()}`;
    setTempJobs((previous) => [
      ...previous,
      {
        id,
        company: tempCompany.trim() || "临时公司",
        title,
        rawJd,
        source: "temp",
      },
    ]);
    setTempJd("");
    setTempTitle("");
    setTempCompany("");
    setError("");
  };

  const onUploadSkill = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setPreferenceSkill(text);
    setSkillMessage(`已从 ${file.name} 读入 ${text.length} 字。`);
  };

  const copyElicitation = async () => {
    try {
      await navigator.clipboard.writeText(ELICITATION_SKILL_MARKDOWN);
      setSkillMessage("访谈协议已复制；可粘到 Cursor / ChatGPT 完成采访，再把生成的专属 SKILL 贴回来。");
    } catch {
      setSkillMessage("复制失败，请改用下载。");
    }
  };

  const rankJobs = async () => {
    setIsRanking(true);
    setError("");
    setSignInPath("");
    setMeta("");
    setLogPath("");
    setAnalysis(null);
    setExpandedId("");
    const started = performance.now();
    try {
      const response = await fetch("/api/spike/rank-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferenceSkill: preferenceSkill.trim(),
          jobs: jobsForRank.map(({ id, company, title, rawJd }) => ({ id, company, title, rawJd })),
        }),
      });
      const payload = await response.json() as RankPayload;
      if (payload.runLog) {
        try {
          const saved = await persistSpikeRunLogFromBrowser(payload.runLog);
          setLogPath(saved.relativePath);
        } catch (persistError) {
          console.warn("Spike rank log persist skipped", persistError);
        }
      }
      if (response.status === 401) {
        setSignInPath(payload.signInPath ?? "");
        setError(payload.error ?? "需要登录后才能排序。");
        return;
      }
      if (!response.ok || !payload.analysis) {
        throw new Error(payload.error || "排序失败");
      }
      setAnalysis(payload.analysis);
      const seconds = ((performance.now() - started) / 1000).toFixed(1);
      setMeta([
        payload.pipelineVersion ?? "spike-rank",
        payload.provider && payload.model ? `${payload.provider} · ${payload.model}` : "",
        `耗时 ${seconds}s`,
        `${payload.analysis.ranked.length} 岗`,
      ].filter(Boolean).join(" · "));
    } catch (rankError) {
      setError(rankError instanceof Error ? rankError.message : "排序暂时不可用。");
    } finally {
      setIsRanking(false);
    }
  };

  return (
    <div className="spike-page">
      <header className="spike-header">
        <div>
          <p className="spike-kicker">私人 UX 测床 · 择业排序 0.1</p>
          <h1>按你的择业 SKILL，给收藏岗打分排序</h1>
          <p className="spike-lead">
            上传专属择业 SKILL，多选主站已收录岗位（可加临时 JD），一次对比门控与效用分。
            不做站内访谈聊天；访谈协议可复制到外部 Agent。
          </p>
          <SpikeNav />
        </div>
        <Link className="secondary-button" href="/jobs">去收录岗位</Link>
      </header>

      <section className="card spike-panel">
        <div className="spike-panel-head">
          <h2>1. 择业 SKILL</h2>
          <span>门控 · 权重 · 锚点</span>
        </div>
        <div className="spike-skill-actions">
          <label className="spike-file spike-file-inline">
            <input
              type="file"
              accept=".md,.txt,text/markdown,text/plain"
              onChange={(event) => {
                void onUploadSkill(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <strong>上传 .md</strong>
          </label>
          <button className="secondary-button" type="button" onClick={() => setShowElicitation((value) => !value)}>
            {showElicitation ? "收起访谈协议" : "获取访谈协议"}
          </button>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setPreferenceSkill("");
              try { window.localStorage.removeItem(PREFERENCE_SKILL_STORAGE_KEY); } catch { /* ignore */ }
              setSkillMessage("已清空本地择业 SKILL。");
            }}
          >
            清空
          </button>
        </div>
        {skillMessage && <p className="spike-hint">{skillMessage}</p>}
        {showElicitation && (
          <div className="spike-elicitation">
            <p>
              把协议交给 Cursor / ChatGPT 做结构化采访，产出你的专属可打分 SKILL，再粘贴回上方文本框。
            </p>
            <div className="spike-skill-actions">
              <button className="secondary-button" type="button" onClick={() => void copyElicitation()}>复制协议</button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => downloadText("career-preference-elicitation.md", ELICITATION_SKILL_MARKDOWN)}
              >
                下载 .md
              </button>
            </div>
            <pre className="spike-elicitation-preview">{ELICITATION_SKILL_MARKDOWN.slice(0, 1200)}…</pre>
          </div>
        )}
        <textarea
          className="spike-textarea"
          value={preferenceSkill}
          onChange={(event) => setPreferenceSkill(event.target.value)}
          placeholder="粘贴你的专属择业 SKILL（须含门控、权重、0/5/10 锚点与公式）…"
          rows={12}
        />
        <p className="spike-hint">{preferenceSkill.trim().length} 字 · 至少 200 字 · 自动存浏览器本地</p>
      </section>

      <section className="card spike-panel">
        <div className="spike-panel-head">
          <h2>2. 选择岗位</h2>
          <span>已选 {jobsForRank.length} / {MAX_SELECTED}</span>
        </div>
        {libraryJobs.length === 0 ? (
          <p className="spike-hint">
            主站岗位库里还没有带 JD 原文的岗位。请先去
            {" "}
            <Link href="/jobs">岗位管理</Link>
            {" "}
            粘贴收录，或下方添加临时 JD。
          </p>
        ) : (
          <ul className="spike-job-pick">
            {libraryJobs.map((job) => {
              const checked = selectedIds.includes(job.id);
              const disabled = !checked && jobsForRank.length >= MAX_SELECTED;
              return (
                <li key={job.id}>
                  <label className={disabled ? "is-disabled" : undefined}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleJob(job.id)}
                    />
                    <span>
                      <strong>{job.company} · {job.title}</strong>
                      <small>{job.rawJd.length} 字 JD</small>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {tempJobs.length > 0 && (
          <ul className="spike-job-pick spike-temp-jobs">
            {tempJobs.map((job) => (
              <li key={job.id}>
                <strong>临时 · {job.company} · {job.title}</strong>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setTempJobs((previous) => previous.filter((item) => item.id !== job.id))}
                >
                  移除
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="spike-temp-form">
          <h3>临时粘贴 JD（未入库）</h3>
          <div className="spike-temp-fields">
            <input value={tempCompany} onChange={(event) => setTempCompany(event.target.value)} placeholder="公司（可选）" />
            <input value={tempTitle} onChange={(event) => setTempTitle(event.target.value)} placeholder="岗位标题（可选）" />
          </div>
          <textarea
            className="spike-textarea"
            value={tempJd}
            onChange={(event) => setTempJd(event.target.value)}
            placeholder="粘贴完整 JD 原文…"
            rows={6}
          />
          <button className="secondary-button" type="button" onClick={addTempJob}>加入对比</button>
        </div>
      </section>

      <div className="spike-actions">
        <button className="primary-button" type="button" disabled={!canRank} onClick={() => void rankJobs()}>
          {isRanking ? "正在按 SKILL 排序（thinking-max，可能要好几分钟）…" : "开始排序"}
        </button>
        {meta && <p className="spike-meta">{meta}</p>}
      </div>

      {logPath && (
        <p className="spike-hint">
          运行日志：
          <code>{logPath}</code>
        </p>
      )}

      {isRanking && (
        <div className="spike-loading" role="status" aria-live="polite">
          <span className="spike-spinner" aria-hidden="true" />
          <div>
            <strong>正在排序</strong>
            <p>按你的门控与权重给 {jobsForRank.length} 个岗位打分。thinking-max 可能需要数分钟，请勿重复点击。</p>
          </div>
        </div>
      )}

      {error && (
        <div className="resume-analysis-error spike-error">
          <strong>{error}</strong>
          {signInPath ? <a className="primary-button" href={signInPath}>去登录</a> : null}
        </div>
      )}

      {analysis && (
        <section className="spike-results">
          <div className="spike-results-head">
            <div>
              <h2>排序结果</h2>
              <p>{analysis.summary}</p>
            </div>
          </div>
          <div className="spike-rank-table-wrap">
            <table className="spike-rank-table">
              <thead>
                <tr>
                  <th>序</th>
                  <th>岗位</th>
                  <th>门控</th>
                  <th>效用分</th>
                  <th>建议</th>
                  <th>主贡献</th>
                  <th>主短板</th>
                </tr>
              </thead>
              <tbody>
                {analysis.ranked.map((row, index) => {
                  const job = jobById.get(row.jobId);
                  const open = expandedId === row.jobId;
                  return (
                    <Fragment key={row.jobId}>
                      <tr
                        className={row.gate === "淘汰" ? "is-rejected" : undefined}
                        onClick={() => setExpandedId(open ? "" : row.jobId)}
                      >
                        <td>{index + 1}</td>
                        <td>
                          <strong>{job ? `${job.company} · ${job.title}` : row.jobId}</strong>
                        </td>
                        <td>{row.gate === "淘汰" ? "淘汰" : "通过"}</td>
                        <td>{row.score == null ? "—" : row.score}</td>
                        <td>{row.recommendation}</td>
                        <td>{row.topContributions.join("；") || "—"}</td>
                        <td>{row.topGaps.join("；") || "—"}</td>
                      </tr>
                      {open && (
                        <tr className="spike-rank-note">
                          <td colSpan={7}>
                            {row.gateReason && <p><b>门控：</b>{row.gateReason}</p>}
                            <p>{row.note || "无补充说明。"}</p>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="spike-hint">点击一行展开说明。此排序是战略偏好，不是简历匹配分。</p>
        </section>
      )}
    </div>
  );
}
