"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { mergeGapAsks } from "../merge-gap-asks.js";
import { persistSpikeRunLogFromBrowser, type SpikeRunLogBody } from "./run-log";
import { placementSortRank } from "./experience-unit-analysis.js";
import { extractResumeTextFromFile } from "./extract-resume-text";
import { SpikeNav } from "./spike-nav";

type ExperienceSuggestion = {
  title: string;
  rewriteType: string;
  placement: keyof typeof placementSortRank | string;
  jdFit: string;
  original: string;
  sourceEvidence: string[];
  revised: string;
  jdEvidence: string;
  reason: string;
  qualityCheck: string;
};

type ExperienceOmit = {
  title: string;
  original: string;
  reason: string;
};

type ExperienceAnalysis = {
  summary: string;
  matches: { title: string; resumeEvidence: string[]; jdEvidence: string; explanation: string }[];
  gaps: { title: string; jdEvidence: string; reason: string; question: string }[];
  questions: { question: string; why: string; jdEvidence: string }[];
  suggestions: ExperienceSuggestion[];
  omit: ExperienceOmit[];
};

type AnalyzePayload = {
  analysis?: ExperienceAnalysis;
  error?: string;
  signInPath?: string;
  provider?: string;
  model?: string;
  pipelineVersion?: string;
  runLog?: SpikeRunLogBody;
};

function buildMarkdown(analysis: ExperienceAnalysis) {
  const lines = [
    "# 投递版经历编排（测床实验）",
    "",
    analysis.summary ? `概要：${analysis.summary}` : "",
    "",
    "以下卡片 = 建议放进本次投递版的经历（顺序：前置 → 后置）。「拿下」见 omit，不是卡片。",
    "",
  ];
  analysis.suggestions.forEach((item, index) => {
    lines.push(`## ${index + 1}. [${item.placement}] ${item.title}`);
    lines.push(`类型：${item.rewriteType} · JD匹配：${item.jdFit}`);
    lines.push("");
    lines.push("原经历块：");
    lines.push(item.original);
    lines.push("");
    lines.push("投递版经历块：");
    lines.push(item.revised);
    lines.push("");
    if (item.reason) lines.push(`理由：${item.reason}`);
    lines.push("");
  });
  if (analysis.omit?.length) {
    lines.push("## 本次建议不放（omit）");
    analysis.omit.forEach((item) => {
      lines.push(`- ${item.title}：${item.reason}`);
    });
    lines.push("");
  }
  const gapAsks = mergeGapAsks(analysis.gaps, analysis.questions);
  if (gapAsks.length) {
    lines.push("## 证据缺口与追问");
    gapAsks.forEach((item) => {
      lines.push(`- ${item.title}：${item.reason}`);
      if (item.question) lines.push(`  追问：${item.question}`);
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
  const [logPath, setLogPath] = useState("");
  const [analysis, setAnalysis] = useState<ExperienceAnalysis | null>(null);
  const [copyMessage, setCopyMessage] = useState("");

  const canAnalyze = jdText.trim().length >= 20
    && resumeText.trim().length >= 80
    && !isAnalyzing
    && !isImporting;

  const suggestionCount = analysis?.suggestions.length ?? 0;

  const sortedSuggestions = useMemo(() => {
    if (!analysis) return [];
    return [...analysis.suggestions].sort((left, right) => {
      const leftRank = placementSortRank[left.placement as keyof typeof placementSortRank] ?? 99;
      const rightRank = placementSortRank[right.placement as keyof typeof placementSortRank] ?? 99;
      return leftRank - rightRank;
    });
  }, [analysis]);

  const gapAsks = useMemo(
    () => (analysis ? mergeGapAsks(analysis.gaps, analysis.questions) : []),
    [analysis],
  );

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
    setLogPath("");
    setAnalysis(null);
    const started = performance.now();
    try {
      const response = await fetch("/api/spike/optimize-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jdText: jdText.trim(),
          resumeText: resumeText.trim(),
        }),
      });
      const payload = await response.json() as AnalyzePayload;
      if (payload.runLog) {
        try {
          const saved = await persistSpikeRunLogFromBrowser(payload.runLog);
          setLogPath(saved.relativePath);
        } catch (persistError) {
          console.warn("Spike run log persist skipped", persistError);
        }
      }
      if (response.status === 401) {
        setSignInPath(payload.signInPath ?? "");
        setError(payload.error ?? "需要登录后才能分析（本地应配置 Key 并免登录）。");
        return;
      }
      if (!response.ok || !payload.analysis) {
        throw new Error(payload.error || "分析失败");
      }
      const next = payload.analysis;
      setAnalysis(next);
      const seconds = ((performance.now() - started) / 1000).toFixed(1);
      setMeta([
        payload.pipelineVersion ?? "spike-experience",
        payload.provider && payload.model ? `${payload.provider} · ${payload.model}` : "",
        `耗时 ${seconds}s`,
        `${next.suggestions.length} 段保留`,
        `${next.omit?.length ?? 0} 段不放`,
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
          <p className="spike-kicker">私人 UX 测床 · 投递版编排 0.4</p>
          <h1>看 JD，排出这次简历该长什么样</h1>
          <p className="spike-lead">
            输入可以是「繁历」；输出是本次投递版经历区：保留谁、谁靠前、块内怎么改。
            「拿下」只进 omit 清单，不做经历卡。不要求全覆盖，不要求段落守恒，不写回 Word。
          </p>
          <SpikeNav />
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
          {isAnalyzing ? "正在编排投递版经历（thinking-max，可能要好几分钟）…" : "生成投递版经历编排"}
        </button>
        {meta && <span className="spike-meta">{meta}</span>}
      </div>
      {logPath && (
        <p className="spike-hint">
          本次运行已写入本地日志：
          <code>{logPath}</code>
          （目录 gitignore；攒几份后可让 Agent 对照评改写质量）
        </p>
      )}

      {isAnalyzing && (
        <div className="spike-loading" role="status" aria-live="polite">
          <span className="spike-spinner" aria-hidden="true" />
          <div>
            <strong>正在分析</strong>
            <p>先建蓝图，再按「投递版该留哪些经历」出卡。已开启 DeepSeek thinking-max，可能需要数分钟，请勿重复点击。</p>
          </div>
        </div>
      )}

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
              <h2>投递版经历区</h2>
              <p>
                {analysis.summary
                  || `${suggestionCount} 段保留经历；已按「前置 → 后置」排序。拿下项见下方 omit。`}
              </p>
            </div>
            <button className="secondary-button" type="button" onClick={() => void copyMarkdown()}>
              复制为 Markdown
            </button>
          </div>
          {copyMessage && <p className="spike-hint">{copyMessage}</p>}

          <div className="spike-suggestion-list">
            {sortedSuggestions.map((item) => (
              <article className="card spike-suggestion" key={`${item.title}-${item.original.slice(0, 48)}`}>
                <div className="spike-suggestion-top">
                  <strong>{item.title}</strong>
                  <span>位置：{item.placement}</span>
                  <span>JD：{item.jdFit}</span>
                  <span>{item.rewriteType}</span>
                </div>
                <div className="spike-diff">
                  <div>
                    <span>原经历块</span>
                    <p>{item.original}</p>
                  </div>
                  <div>
                    <span>投递版经历块</span>
                    <p>{item.revised}</p>
                  </div>
                </div>
                {item.reason && <p className="spike-reason">理由：{item.reason}</p>}
              </article>
            ))}
            {!sortedSuggestions.length && (
              <p className="spike-hint">
                本次没有通过校验的保留经历（常见原因：original 未整段引用任职块）。可看下方 omit 与缺口。
              </p>
            )}
          </div>

          {(analysis.omit?.length ?? 0) > 0 && (
            <section className="card spike-panel spike-omit">
              <h3>本次建议不放（omit）</h3>
              <p className="spike-hint">这些经历建议别放进这次投递版；不是经历卡，也不会进入改简历主清单。</p>
              <ul>
                {analysis.omit.map((item) => {
                  const preview = item.original.trim();
                  const showPreview = preview
                    && preview !== item.title.trim()
                    && !item.title.trim().startsWith(preview)
                    && preview.length > item.title.trim().length + 8;
                  return (
                    <li key={`${item.title}-${item.original.slice(0, 32)}`}>
                      <strong>{item.title}</strong>
                      <p>{item.reason}</p>
                      {showPreview ? (
                        <small>{preview.slice(0, 160)}{preview.length > 160 ? "…" : ""}</small>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {gapAsks.length > 0 && (
            <section className="card spike-panel spike-gap-asks">
              <h3>证据缺口与追问</h3>
              <p className="spike-hint">同一缺口只列一次：先看缺什么，再看要不要补一句事实。</p>
              <ul>
                {gapAsks.map((item) => (
                  <li key={`${item.title}-${item.question || item.reason}`}>
                    <strong>{item.title}</strong>
                    <p>{item.reason}</p>
                    {item.question ? <em>追问：{item.question}</em> : null}
                    {item.jdEvidence ? <small>JD：“{item.jdEvidence}”</small> : null}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </section>
      )}
    </div>
  );
}
