"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { normalizeStoredResumeAnalysis } from "../resume-analysis.js";
import type { ResumeAnalysis } from "../workspace/types";
import { extractResumeTextFromFile } from "./extract-resume-text";

type AnalyzePayload = {
  analysis?: ResumeAnalysis;
  error?: string;
  signInPath?: string;
  provider?: string;
  model?: string;
};

function buildMarkdown(analysis: ResumeAnalysis) {
  const lines = [
    `# 修改意见（测床导出）`,
    "",
    analysis.summary ? `概要：${analysis.summary}` : "",
    "",
  ];
  analysis.suggestions.forEach((item, index) => {
    lines.push(`## ${index + 1}. [${item.priority}] ${item.title}`);
    lines.push(`类型：${item.rewriteType}`);
    lines.push("");
    lines.push(`原表述：`);
    lines.push(item.original);
    lines.push("");
    lines.push(`建议：`);
    lines.push(item.revised);
    lines.push("");
    if (item.reason) lines.push(`理由：${item.reason}`);
    lines.push("");
  });
  if (analysis.gaps.length) {
    lines.push(`## 证据缺口`);
    analysis.gaps.forEach((gap) => {
      lines.push(`- ${gap.title}：${gap.reason}`);
      if (gap.question) lines.push(`  追问：${gap.question}`);
    });
  }
  return lines.filter((line) => line !== undefined).join("\n").trim();
}

export default function SpikeOpinionBedPage() {
  const [jdText, setJdText] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [signInPath, setSignInPath] = useState("");
  const [meta, setMeta] = useState("");
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [copyMessage, setCopyMessage] = useState("");

  const canAnalyze = jdText.trim().length >= 20
    && resumeText.trim().length >= 80
    && !isAnalyzing
    && !isImporting;

  const suggestionCount = analysis?.suggestions.length ?? 0;

  const sortedSuggestions = useMemo(() => {
    if (!analysis) return [];
    const rank = { 核心: 0, 重要: 1, 加分: 2 } as const;
    return [...analysis.suggestions].sort(
      (left, right) => rank[left.priority] - rank[right.priority],
    );
  }, [analysis]);

  const onPickResume = async (file: File | undefined) => {
    if (!file) return;
    setIsImporting(true);
    setImportMessage("");
    setError("");
    try {
      const text = await extractResumeTextFromFile(file);
      if (text.length < 80) {
        throw new Error("提取出的简历文本过短，请检查文件或改为粘贴正文。");
      }
      setResumeText(text);
      setResumeFileName(file.name);
      setImportMessage(`已从 ${file.name} 提取 ${text.length} 字，可在下方核对。`);
    } catch (extractError) {
      setImportMessage(extractError instanceof Error ? extractError.message : "简历文件解析失败。");
    } finally {
      setIsImporting(false);
    }
  };

  const analyze = async () => {
    setIsAnalyzing(true);
    setError("");
    setSignInPath("");
    setCopyMessage("");
    setMeta("");
    setAnalysis(null);
    const started = performance.now();
    try {
      const response = await fetch("/api/optimize-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jdText: jdText.trim(),
          resumeText: resumeText.trim(),
        }),
      });
      const payload = await response.json() as AnalyzePayload;
      if (response.status === 401) {
        setSignInPath(payload.signInPath ?? "");
        setError(payload.error ?? "需要登录后才能分析（本地应配置 Key 并免登录）。");
        return;
      }
      if (!response.ok || !payload.analysis) {
        throw new Error(payload.error || "分析失败");
      }
      const next = normalizeStoredResumeAnalysis({
        ...payload.analysis,
        accepted: [],
      }) as ResumeAnalysis;
      setAnalysis(next);
      const seconds = ((performance.now() - started) / 1000).toFixed(1);
      setMeta([
        payload.provider && payload.model ? `${payload.provider} · ${payload.model}` : "",
        `耗时 ${seconds}s`,
        `${next.suggestions.length} 条意见`,
      ].filter(Boolean).join(" · "));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "分析暂时不可用。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyMarkdown = async () => {
    if (!analysis) return;
    try {
      await navigator.clipboard.writeText(buildMarkdown(analysis));
      setCopyMessage("已复制为 Markdown，可粘到别处对照修改。");
    } catch {
      setCopyMessage("复制失败，请手动选择文本。");
    }
  };

  return (
    <div className="spike-page">
      <header className="spike-header">
        <div>
          <p className="spike-kicker">私人 UX 测床 · spike</p>
          <h1>看 JD，出修改意见</h1>
          <p className="spike-lead">
            验收路径是否丝滑：粘贴 JD、上传简历、生成结构化意见。不写回 Word，不进岗位/简历中心。
            意见质量请在主产品由产品负责人验收。两阶段分析可能需要一到两分钟，请耐心等待。
          </p>
        </div>
        <Link className="secondary-button" href="/jobs">回主工作台</Link>
      </header>

      <div className="spike-grid">
        <section className="card spike-panel">
          <div className="spike-panel-head">
            <h2>1. 岗位 JD</h2>
            <span>纯文本</span>
          </div>
          <textarea
            className="spike-textarea"
            value={jdText}
            onChange={(event) => setJdText(event.target.value)}
            placeholder="粘贴完整 JD 原文…"
            rows={14}
          />
          <p className="spike-hint">{jdText.trim().length} 字 · 至少 20 字</p>
        </section>

        <section className="card spike-panel">
          <div className="spike-panel-head">
            <h2>2. 简历</h2>
            <span>.docx / .pdf</span>
          </div>
          <label className="spike-file">
            <input
              type="file"
              accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={isImporting}
              onChange={(event) => {
                void onPickResume(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <strong>{isImporting ? "正在提取…" : "选择简历文件"}</strong>
            <small>{resumeFileName || "提取为纯文本后可再编辑核对"}</small>
          </label>
          {importMessage && <p className="spike-hint">{importMessage}</p>}
          <textarea
            className="spike-textarea"
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value)}
            placeholder="上传文件后文本会出现在这里；也可以直接粘贴简历正文。"
            rows={12}
          />
          <p className="spike-hint">{resumeText.trim().length} 字 · 至少 80 字</p>
        </section>
      </div>

      <div className="spike-actions">
        <button className="primary-button" type="button" disabled={!canAnalyze} onClick={() => void analyze()}>
          {isAnalyzing ? "正在生成意见（两阶段，可能超过 1 分钟）…" : "生成修改意见"}
        </button>
        {meta && <span className="spike-meta">{meta}</span>}
      </div>

      {error && (
        <div className="resume-analysis-error spike-error">
          <strong>{error}</strong>
          {signInPath ? (
            <a className="primary-button" href={signInPath}>去登录</a>
          ) : null}
        </div>
      )}

      {analysis && (
        <section className="spike-results">
          <div className="spike-results-head">
            <div>
              <h2>修改意见</h2>
              <p>{analysis.summary || `${suggestionCount} 条建议；自行决定取舍与措辞，系统不改文件。`}</p>
            </div>
            <button className="secondary-button" type="button" onClick={() => void copyMarkdown()}>
              复制为 Markdown
            </button>
          </div>
          {copyMessage && <p className="spike-hint">{copyMessage}</p>}

          <div className="spike-suggestion-list">
            {sortedSuggestions.map((item) => (
              <article className="card spike-suggestion" key={`${item.title}-${item.original}`}>
                <div className="spike-suggestion-top">
                  <strong>{item.title}</strong>
                  <span>{item.priority}</span>
                  <span>{item.rewriteType}</span>
                </div>
                <div className="spike-diff">
                  <div>
                    <span>原表述</span>
                    <p>{item.original}</p>
                  </div>
                  <div>
                    <span>建议</span>
                    <p>{item.revised}</p>
                  </div>
                </div>
                {item.reason && <p className="spike-reason">理由：{item.reason}</p>}
              </article>
            ))}
            {!sortedSuggestions.length && (
              <p className="spike-hint">本次没有返回可展示的修改建议（可能被校验过滤）。可看下方缺口与追问。</p>
            )}
          </div>

          {(analysis.gaps.length > 0 || analysis.questions.length > 0) && (
            <div className="spike-side-findings">
              {analysis.gaps.length > 0 && (
                <section className="card spike-panel">
                  <h3>证据缺口</h3>
                  <ul>
                    {analysis.gaps.map((gap) => (
                      <li key={`${gap.title}-${gap.jdEvidence}`}>
                        <strong>{gap.title}</strong>
                        <p>{gap.reason}</p>
                        {gap.question && <small>追问：{gap.question}</small>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {analysis.questions.length > 0 && (
                <section className="card spike-panel">
                  <h3>追问</h3>
                  <ul>
                    {analysis.questions.map((item) => (
                      <li key={item.question}>
                        <strong>{item.question}</strong>
                        <p>{item.why}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
