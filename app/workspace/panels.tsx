"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buildRuleFieldMeta } from "../job-extraction.js";
import { mergeGapAsks } from "../merge-gap-asks.js";
import { parseJobText } from "../job-parser.js";
import { normalizeStoredResumeAnalysis } from "../resume-analysis.js";
import {
  exportTailoredResumeWord,
  hasResumeTemplate,
  saveResumeTemplate,
} from "../resume-template";
import { LOCAL_KEYS } from "./constants";
import { JobTabLink } from "./job-tab-link";
import { emptyFieldMeta } from "./types";
import type {
  CaptureMethod,
  ExtractionFieldKey,
  ExtractionFieldMeta,
  JobRecord,
  JobStatus,
  ResumeAnalysis,
  ResumeSource,
  ResumeVersion,
} from "./types";

export function JobList({
  jobs,
  allJobs,
  overdueJobs,
  filter,
  reminderDismissed,
  onFilter,
  onDismissReminder,
  onNew,
  onMarkSubmitted,
}: {
  jobs: JobRecord[];
  allJobs: JobRecord[];
  overdueJobs: JobRecord[];
  filter: string;
  reminderDismissed: boolean;
  onFilter: (value: string) => void;
  onDismissReminder: () => void;
  onNew: () => void;
  onMarkSubmitted: (jobId: string) => void;
}) {
  const filters = ["全部", "待投递", "已投递", "面试中", "Offer", "已结束"];
  const counts = {
    待投递: allJobs.filter((job) => job.status === "待投递").length,
    已投递: allJobs.filter((job) => job.status === "已投递").length,
    面试中: allJobs.filter((job) => job.status === "面试中").length,
  };

  return (
    <div className="job-list-page">
      <section className="list-heading">
        <div>
          <span className="kicker">个人求职进度</span>
          <h1>我的岗位</h1>
          <p>把看到的机会先收进来，再一步步推进到实际投递。</p>
        </div>
        <button className="primary-button" onClick={onNew}>＋ 收录新岗位</button>
      </section>

      <section className="stats-strip" aria-label="岗位状态概览">
        <div><span>全部岗位</span><strong>{allJobs.length}</strong><small>已建立个人记录</small></div>
        <div><span>待投递</span><strong>{counts.待投递}</strong><small>需要继续准备</small></div>
        <div><span>已投递</span><strong>{counts.已投递}</strong><small>等待后续进展</small></div>
        <div><span>面试中</span><strong>{counts.面试中}</strong><small>持续准备与复盘</small></div>
      </section>

      {!reminderDismissed && overdueJobs.length > 0 && (
        <section className="reminder-banner" role="status">
          <div className="reminder-icon">⌛</div>
          <div>
            <strong>你有 {overdueJobs.length} 个岗位已收录超过 24 小时，仍待投递。</strong>
            <p>建议今天完成材料准备或确认是否继续申请。</p>
          </div>
          <button className="secondary-button" onClick={() => onFilter("待投递")}>查看待投递岗位</button>
          <button className="quiet-button" onClick={onDismissReminder}>稍后提醒</button>
        </section>
      )}

      <section className="job-list-card card">
        <div className="list-toolbar">
          <div className="filter-tabs" aria-label="筛选岗位状态">
            {filters.map((item) => (
              <button key={item} className={filter === item ? "active" : ""} onClick={() => onFilter(item)}>{item}</button>
            ))}
          </div>
          <label className="list-search"><span>⌕</span><input aria-label="搜索岗位" placeholder="搜索公司或岗位" /></label>
        </div>

        <div className="job-table-head">
          <span>岗位</span><span>来源与时间</span><span>材料准备</span><span>状态</span><span>操作</span>
        </div>
        <div className="job-rows">
          {jobs.map((job) => {
            const overdue = job.status === "待投递" && job.ageHours >= 24;
            return (
              <article className={overdue ? "job-row overdue" : "job-row"} key={job.id}>
                <div className="job-cell-main">
                  <span className={`table-logo ${job.tone}`}>{job.mark}</span>
                  <div><strong>{job.title}</strong><p>{job.company} · {job.location} · {job.category}</p></div>
                </div>
                <div className="source-cell">
                  <strong>{job.rawJd ? job.discoverySource : "示例岗位"}</strong>
                  <span>{job.rawJd ? `${job.captureMethod} · 保存于 ${job.savedLabel}` : "未保存真实 JD 原文"}</span>
                  {overdue && <em>已收录 {job.ageHours} 小时</em>}
                </div>
                <div className="material-cell"><span>{job.rawJd ? job.materials : "需先收录真实 JD"}</span><i><b style={{ width: job.rawJd ? (job.status === "待投递" ? "54%" : "100%") : "0%" }} /></i></div>
                <div><span className={`status-chip status-${job.status}`}>{job.status}</span>{job.applicationMethod && <small className="application-method">通过{job.applicationMethod}</small>}</div>
                <div className="row-actions">
                  <Link className="text-button" href={`/jobs/${job.id}`}>进入工作区</Link>
                  {job.status === "待投递" && <button className="mini-primary" onClick={() => onMarkSubmitted(job.id)}>标记已投递</button>}
                </div>
              </article>
            );
          })}
          {jobs.length === 0 && <div className="empty-list"><strong>暂无该状态的岗位</strong><span>切换筛选条件或收录一个新岗位。</span></div>}
        </div>
      </section>
    </div>
  );
}

export function NewJobDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (job: JobRecord) => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [method, setMethod] = useState<CaptureMethod>("JD 文本");
  const [jdText, setJdText] = useState("");
  const [comingSoonMessage, setComingSoonMessage] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [employment, setEmployment] = useState("");
  const [category, setCategory] = useState("其他");
  const [source, setSource] = useState("其他");
  const [summary, setSummary] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [ccEmail, setCcEmail] = useState("");
  const [business, setBusiness] = useState("");
  const [fieldEvidence, setFieldEvidence] = useState({ company: "", title: "", location: "", employment: "", category: "", email: "", ccEmail: "" });
  const [fieldMeta, setFieldMeta] = useState<Record<ExtractionFieldKey, ExtractionFieldMeta>>(emptyFieldMeta);
  const [recognizedCount, setRecognizedCount] = useState(0);
  const [recognitionMode, setRecognitionMode] = useState<"parsed" | "manual">("manual");
  const [recognitionEngine, setRecognitionEngine] = useState<"llm" | "rule" | "manual">("manual");
  const [recognitionWarning, setRecognitionWarning] = useState("");
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [formError, setFormError] = useState("");
  const methods: { id: CaptureMethod; icon: string; title: string; description: string; available: boolean }[] = [
    { id: "岗位链接", icon: "↗", title: "粘贴岗位链接", description: "网页读取能力正在准备中", available: false },
    { id: "JD 文本", icon: "文", title: "粘贴 JD 文本", description: "当前开放 · 最稳定的导入方式", available: true },
    { id: "岗位截图", icon: "图", title: "上传岗位截图", description: "图片识别能力正在准备中", available: false },
    { id: "插件保存", icon: "插", title: "插件一键保存", description: "插件连接能力正在准备中", available: false },
  ];

  const applyRecognitionResult = (result: ReturnType<typeof parseJobText> & { fieldMeta?: Record<ExtractionFieldKey, ExtractionFieldMeta> }) => {
    setCompany(result.company);
    setTitle(result.title);
    setLocation(result.location);
    setEmployment(result.employment);
    setCategory(result.category);
    setSummary(result.summary);
    setContactEmail(result.email);
    setCcEmail(result.ccEmail);
    setBusiness(result.business);
    setFieldEvidence(result.evidence);
    setFieldMeta((result.fieldMeta ?? buildRuleFieldMeta(jdText, result)) as Record<ExtractionFieldKey, ExtractionFieldMeta>);
    setRecognizedCount([
      result.company,
      result.title,
      result.location,
      result.employment,
      result.category !== "其他" ? result.category : "",
      result.business,
      result.email,
      result.ccEmail,
    ].filter(Boolean).length);
  };

  const beginRecognition = async () => {
    setFormError("");
    setSource("其他");
    setRecognitionWarning("");

    if (method === "JD 文本") {
      if (!jdText.trim()) {
        setFormError("请先粘贴岗位 JD 文本。");
        return;
      }
      setIsRecognizing(true);
      try {
        const response = await fetch("/api/extract-job", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jdText }),
        });
        if (!response.ok) throw new Error("岗位识别请求失败");
        const payload = await response.json() as {
          mode: "llm" | "rule_fallback";
          data: ReturnType<typeof parseJobText> & { fieldMeta?: Record<ExtractionFieldKey, ExtractionFieldMeta> };
          warning?: string;
        };
        applyRecognitionResult(payload.data);
        setRecognitionEngine(payload.mode === "llm" ? "llm" : "rule");
        setRecognitionWarning(payload.warning ?? "");
      } catch {
        const result = parseJobText(jdText);
        applyRecognitionResult(result);
        setRecognitionEngine("rule");
        setRecognitionWarning("AI 语义识别暂时不可用，已安全降级为规则解析；请重点核对推断字段。");
      } finally {
        setIsRecognizing(false);
      }
      setRecognitionMode("parsed");
      setStep(2);
      return;
    }

  };

  const fieldBadge = (key: ExtractionFieldKey, value: string, missingLabel = "请核对") => {
    if (!value) return <em>{missingLabel}</em>;
    const meta = fieldMeta[key];
    if (meta.source === "llm" && meta.basis === "explicit") return <b>AI＋原文校验</b>;
    if (meta.source === "llm" && meta.basis === "inferred") return <em>AI 语义推断</em>;
    if (meta.basis === "inferred") return <em>规则推断·请核对</em>;
    return <b>原文直接提取</b>;
  };

  const evidenceLabel = (key: ExtractionFieldKey) => {
    const meta = fieldMeta[key];
    if (!meta.evidence) return "";
    const explanation = meta.basis === "inferred" && meta.reason ? ` · ${meta.reason}` : "";
    return `依据：“${meta.evidence}”${explanation}`;
  };

  const create = () => {
    if (!company.trim() || !title.trim()) {
      setFormError("请至少填写公司名称和岗位名称，再创建岗位记录。");
      return;
    }
    onCreate({
      id: `job-${Date.now()}`,
      mark: company.slice(0, 1) || "新",
      tone: "violet",
      company: company.trim(),
      title: title.trim(),
      location: location.trim() || "地点待确认",
      employment: employment || "性质待确认",
      category,
      discoverySource: source,
      captureMethod: method,
      sourceHost: method,
      status: "待投递",
      savedLabel: "刚刚",
      ageHours: 0,
      materials: method === "JD 文本" ? "JD 已解析 · 待优化" : "岗位信息待补充",
      jdSummary: summary,
      rawJd: method === "JD 文本" ? jdText.trim() : undefined,
      contactEmail: contactEmail || undefined,
      ccEmail: ccEmail || undefined,
      business: business || undefined,
    });
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-panel new-job-modal" role="dialog" aria-modal="true" aria-labelledby="new-job-title">
        <div className="modal-header">
          <div><span>新增岗位 · {step}/2</span><h2 id="new-job-title">{step === 1 ? "先把岗位收进来" : "确认岗位信息"}</h2></div>
          <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        </div>

        {step === 1 ? (
          <>
            <p className="modal-intro">选择最方便的方式。识别完成后，你还可以检查和修改所有字段。</p>
            <div className="capture-methods">
              {methods.map((item) => (
                <button
                  key={item.id}
                  className={`capture-method${method === item.id ? " active" : ""}${item.available ? "" : " unavailable"}`}
                  aria-disabled={!item.available}
                  onClick={() => {
                    if (!item.available) {
                      setComingSoonMessage(`“${item.title}”功能尚未开放，请先粘贴 JD 文本。`);
                      return;
                    }
                    setComingSoonMessage("");
                    setMethod(item.id);
                  }}
                >
                  <span>{item.icon}</span><strong>{item.title}</strong><small>{item.description}</small><i>{item.available ? method === item.id ? "✓" : "" : "暂未开放"}</i>
                </button>
              ))}
            </div>
            {comingSoonMessage && <p className="coming-soon-notice" role="status"><span>i</span>{comingSoonMessage}</p>}
            <div className="capture-input">
              {method === "JD 文本" && <label><span>岗位 JD</span><textarea value={jdText} onChange={(event) => setJdText(event.target.value)} placeholder="粘贴完整岗位信息，包含公司、岗位、地点和招聘要求时识别更准确" /></label>}
            </div>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <div className="privacy-line"><span>✓</span>不会要求招聘网站账号、密码、验证码或 Cookie</div>
            <div className="modal-footer"><button className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={isRecognizing} onClick={beginRecognition}>{isRecognizing ? "正在用 AI 理解…" : "AI 理解岗位信息"}{!isRecognizing && " →"}</button></div>
          </>
        ) : (
          <>
            <div className={recognitionEngine === "llm" ? "recognition-summary ai-recognition" : "recognition-summary needs-review"}><span>{recognitionEngine === "llm" ? "✦" : "!"}</span><div><strong>{recognitionEngine === "llm" ? `AI 已理解并校验 ${recognizedCount} 个岗位字段` : recognitionMode === "parsed" ? `规则解析出 ${recognizedCount} 个岗位字段` : "当前方式尚未接入自动读取"}</strong><p>{recognitionEngine === "llm" ? "直接提取与语义推断已分开标记；请重点核对橙色推断字段。" : recognitionWarning || "请手动补充必填字段；系统不会使用演示数据冒充识别结果。"}</p></div><em>{recognitionEngine === "llm" ? "AI 语义识别" : method}</em></div>
            <div className="confirm-grid">
              <label><span>公司名称 {fieldBadge("company", company, "请补充")}</span><input value={company} onChange={(event) => setCompany(event.target.value)} />{fieldEvidence.company && <small className="field-evidence" title={evidenceLabel("company")}>{evidenceLabel("company")}</small>}</label>
              <label><span>岗位名称 {fieldBadge("title", title, "请补充")}</span><input value={title} onChange={(event) => setTitle(event.target.value)} />{fieldEvidence.title && <small className="field-evidence" title={evidenceLabel("title")}>{evidenceLabel("title")}</small>}</label>
              <label><span>工作地点 {fieldBadge("location", location)}</span><input value={location} onChange={(event) => setLocation(event.target.value)} />{fieldEvidence.location && <small className="field-evidence" title={evidenceLabel("location")}>{evidenceLabel("location")}</small>}</label>
              <label><span>工作性质 {fieldBadge("employment", employment)}</span><select value={employment} onChange={(event) => setEmployment(event.target.value)}><option value="">请选择</option><option>实习</option><option>全职</option><option>兼职</option><option>其他</option></select>{fieldEvidence.employment && <small className="field-evidence" title={evidenceLabel("employment")}>{evidenceLabel("employment")}</small>}</label>
              <label><span>岗位类别 {fieldBadge("category", category)}</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>产品 / 运营</option><option>运营</option><option>产品</option><option>法务</option><option>市场</option><option>销售</option><option>职能</option><option>技术</option><option>其他</option></select>{fieldEvidence.category && <small className="field-evidence" title={evidenceLabel("category")}>{evidenceLabel("category")}</small>}</label>
              <label><span>你在哪里看到这个岗位？ <em>请确认</em></span><select value={source} onChange={(event) => setSource(event.target.value)}><option>企业官网</option><option>BOSS直聘</option><option>微信公众号</option><option>实习群 / 求职群</option><option>学校就业网</option><option>小红书</option><option>朋友推荐</option><option>内推</option><option>其他</option></select></label>
            </div>
            <div className="jd-preview"><div><strong>JD 摘要</strong><span>{method === "JD 文本" ? "已保留原文" : "等待补充"}</span></div><p>{summary}</p></div>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <div className="default-status-note"><span>待投递</span><p>创建后自动进入待投递状态；超过 24 小时仍未投递时会在工作台提醒。</p></div>
            <div className="modal-footer"><button className="secondary-button" onClick={() => { setFormError(""); setStep(1); }}>← 返回修改</button><button className="primary-button" onClick={create}>确认并创建岗位</button></div>
          </>
        )}
      </section>
    </div>
  );
}

export function ApplicationMethodDialog({ job, onClose, onConfirm }: { job: JobRecord; onClose: () => void; onConfirm: (method: string) => void }) {
  const [method, setMethod] = useState("企业官网");
  const methods = ["企业官网", "BOSS直聘", "邮件", "内推", "其他", "暂不记录"];
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-panel method-modal" role="dialog" aria-modal="true" aria-labelledby="method-title">
        <div className="modal-header"><div><span>标记已投递</span><h2 id="method-title">通过哪里提交的？</h2></div><button className="modal-close" onClick={onClose}>×</button></div>
        <p className="modal-intro">{job.company} · {job.title}</p>
        <div className="method-options">{methods.map((item) => <button key={item} className={method === item ? "active" : ""} onClick={() => setMethod(item)}><span>{method === item ? "✓" : ""}</span>{item}</button>)}</div>
        <p className="method-hint">投递方式仅用于后续查进度和复盘，不填写也可以继续。</p>
        <div className="modal-footer"><button className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" onClick={() => onConfirm(method === "暂不记录" ? "" : method)}>确认已投递</button></div>
      </section>
    </div>
  );
}

export function ImportedJobOverview({ job, analysis, onAction }: { job: JobRecord; analysis?: ResumeAnalysis; onAction: (message: string) => void }) {
  return (
    <div className="overview-grid">
      <div className="main-column">
        <section className="card jd-card">
          <div className="card-heading">
            <div><span className="kicker">岗位原文解析</span><h2>这份 JD 已确认的信息</h2></div>
            <div className="analysis-state"><span />文本已解析</div>
          </div>
          <div className="insight-summary imported-summary"><div className="quote-mark">“</div><p>{job.jdSummary}</p></div>
          <div className="imported-facts">
            <div><span>招聘单位</span><strong>{job.company}</strong></div>
            <div><span>岗位名称</span><strong>{job.title}</strong></div>
            <div><span>工作地点</span><strong>{job.location}</strong></div>
            <div><span>岗位类别</span><strong>{job.category}</strong></div>
            {job.business && <div><span>业务方向</span><strong>{job.business}</strong></div>}
            {job.contactEmail && <div><span>投递邮箱</span><strong>{job.contactEmail}</strong></div>}
            {job.ccEmail && <div><span>抄送邮箱</span><strong>{job.ccEmail}</strong></div>}
          </div>
          <details className="raw-jd-details"><summary>查看已保存的 JD 原文</summary><p>{job.rawJd}</p></details>
        </section>

        <EvidenceMatchCard analysis={analysis} jobId={job.id} />
      </div>

      <aside className="right-column">
        <section className="card next-step-card">
          <div className="small-card-title"><span className="spark">✦</span><strong>建议下一步</strong><span>刚刚</span></div>
          <h3>先核对岗位信息</h3>
          <p>确认公司、岗位类别、来源渠道和投递邮箱，再开始制作岗位专属材料。</p>
          <JobTabLink jobId={job.id} tab="resume" className="primary-button full">开始准备材料 <span>→</span></JobTabLink>
        </section>
        <section className="card utility-card">
          <div className="small-card-title"><strong>原文保存状态</strong><span className="saved-state">已保存</span></div>
          <p>系统保留了你粘贴的原始 JD，后续分析应以原文为依据。</p>
          <button className="secondary-button full" onClick={() => onAction("岗位原文已安全保存在当前记录中")}>检查保存状态</button>
        </section>
      </aside>
    </div>
  );
}

export function Overview({ job, analysis, onAction }: { job: JobRecord; analysis?: ResumeAnalysis; onAction: (message: string) => void }) {
  if (job.rawJd) {
    return <ImportedJobOverview job={job} analysis={analysis} onAction={onAction} />;
  }
  return (
    <div className="overview-grid">
      <div className="main-column">
        <section className="card jd-card">
          <div className="card-heading">
            <div>
              <span className="kicker">AI 岗位洞察</span>
              <h2>这份 JD 真正在找什么？</h2>
            </div>
            <div className="analysis-state"><span />已完成分析</div>
          </div>

          <div className="insight-summary">
            <div className="quote-mark">“</div>
            <p>这不是单纯的活动执行岗。核心是用<strong>数据洞察用户行为</strong>，再推动产品、销售和运营团队共同落地商业化方案。</p>
          </div>

          <div className="requirements-grid">
            <div className="requirement-block">
              <div className="block-title"><span className="number-chip">01</span><strong>三项核心能力</strong></div>
              <ul className="clean-list">
                <li><span className="list-dot blue" /><div><strong>数据分析与策略判断</strong><small>从业务数据中定位问题并提出方案</small></div></li>
                <li><span className="list-dot violet" /><div><strong>跨团队项目推进</strong><small>协同产品、销售和内容团队完成交付</small></div></li>
                <li><span className="list-dot teal" /><div><strong>商业化产品理解</strong><small>理解广告产品、客户需求与用户体验</small></div></li>
              </ul>
            </div>
            <div className="requirement-block">
              <div className="block-title"><span className="number-chip">02</span><strong>高频关键词</strong></div>
              <div className="keyword-cloud">
                <span>数据分析 <b>5</b></span><span>项目管理 <b>4</b></span><span>商业化 <b>4</b></span>
                <span>用户增长 <b>3</b></span><span>跨团队协作 <b>3</b></span><span>策略运营 <b>2</b></span>
              </div>
              <div className="education-line"><span>✓</span><div><strong>学历要求已满足</strong><small>本科及以上 · 专业不限</small></div></div>
            </div>
          </div>
        </section>

        <EvidenceMatchCard analysis={analysis} jobId={job.id} />
      </div>

      <aside className="right-column">
        <section className="card next-step-card">
          <div className="small-card-title"><span className="spark">✦</span><strong>下一步建议</strong><span>今天</span></div>
          <h3>先优化简历，再开始投递</h3>
          <p>3 处经历表述可以更贴合 JD，预计需要 8 分钟。</p>
          <div className="task-progress"><span style={{ width: "66%" }} /></div>
          <div className="task-meta"><span>准备度 2 / 3</span><strong>还差一步</strong></div>
          <JobTabLink jobId={job.id} tab="resume" className="primary-button full">开始优化简历 <span>→</span></JobTabLink>
        </section>

        <section className="card assets-card">
          <div className="small-card-title"><strong>求职材料</strong><button onClick={() => onAction("材料已刷新")}>刷新</button></div>
          <JobTabLink jobId={job.id} tab="resume" className="asset-row">
            <span className="file-icon resume">简</span><div><strong>岗位专属简历</strong><small>草稿 V1 · 3 处待确认</small></div><b>→</b>
          </JobTabLink>
          <JobTabLink jobId={job.id} tab="letter" className="asset-row">
            <span className="file-icon letter">信</span><div><strong>Cover Letter</strong><small>已生成 · 286 字</small></div><b>→</b>
          </JobTabLink>
          <JobTabLink jobId={job.id} tab="letter" className="asset-row">
            <span className="file-icon mail">邮</span><div><strong>求职邮件正文</strong><small>尚未生成</small></div><b>＋</b>
          </JobTabLink>
        </section>

        <section className="card source-card">
          <div className="small-card-title"><strong>岗位来源</strong><button onClick={() => onAction("已复制岗位链接")}>复制链接</button></div>
          <div className="source-content"><span className="source-logo">{job.mark}</span><div><strong>{job.discoverySource}</strong><small>{job.sourceHost} · 保存时的岗位快照</small></div></div>
          <div className="privacy-note"><span>▣</span>只保存本岗位页面，不读取其他浏览记录</div>
        </section>
      </aside>
    </div>
  );
}

export function EvidenceMatchCard({ analysis, jobId }: { analysis?: ResumeAnalysis; jobId: string }) {
  if (!analysis) {
    return (
      <section className="card match-card pending-analysis-card">
        <div className="card-heading">
          <div><span className="kicker">证据匹配概览</span><h2>简历匹配尚未开始</h2></div>
        </div>
        <p>系统只展示你的简历与当前 JD 之间有原文依据的匹配，不与无法验证的“同类候选人”做百分位比较。</p>
        <JobTabLink jobId={jobId} tab="resume" className="primary-button">去简历定制 →</JobTabLink>
      </section>
    );
  }

  return (
    <section className="card match-card">
      <div className="card-heading">
        <div><span className="kicker">证据匹配概览</span><h2>只看可核对的匹配与缺口</h2></div>
        <JobTabLink jobId={jobId} tab="resume" className="text-button">查看完整建议 →</JobTabLink>
      </div>
      <p className="evidence-score-note">不提供候选人排名或虚构匹配分数；以下数量均来自本次 JD 与主简历的原文核对。</p>
      <div className="evidence-metrics">
        <div><strong>{analysis.matches.length}</strong><span>已有简历证据</span></div>
        <div><strong>{analysis.suggestions.length}</strong><span>可确认修改</span></div>
        <div><strong>{analysis.gaps.length}</strong><span>暂未提供证据</span></div>
      </div>
    </section>
  );
}

export function buildTailoredResume(masterResume: string, analysis?: ResumeAnalysis) {
  if (!analysis) return masterResume;
  return analysis.accepted.reduce((content, index) => {
    const suggestion = analysis.suggestions[index];
    return suggestion && content.includes(suggestion.original)
      ? content.replace(suggestion.original, suggestion.revised)
      : content;
  }, masterResume);
}

export function exportResumePdf(content: string, fileName: string) {
  const popup = window.open("", "_blank");
  if (!popup) return false;
  popup.opener = null;
  const escaped = content
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  const safeTitle = fileName.replace(/[<>:"/\\|?*]+/gu, "-");
  popup.document.write(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    @page { size: A4; margin: 15mm 16mm; }
    body { margin: 0; color: #172033; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
    main { white-space: pre-wrap; font-size: 10.5pt; line-height: 1.55; overflow-wrap: anywhere; }
  </style>
</head>
<body><main>${escaped}</main><script>window.onload=()=>window.print();<\/script></body>
</html>`);
  popup.document.close();
  return true;
}

export function TemplateWordExportButton({
  resumeId,
  content,
  fileName,
  templateReady,
  onAction,
}: {
  resumeId: string;
  content: string;
  fileName: string;
  templateReady: boolean;
  onAction: (message: string) => void;
}) {
  const [isExporting, setIsExporting] = useState(false);

  return (
    <button
      className="secondary-button"
      disabled={isExporting || content.trim().length < 80}
      title={templateReady ? "保留原 Word 的字体、表格、分栏和页面设置" : "请先在简历中心重新选择一次原始 Word"}
      onClick={async () => {
        if (!templateReady) {
          onAction("请先到简历中心重新选择一次原始 Word，系统需要在本地保存模板");
          return;
        }
        setIsExporting(true);
        try {
          const result = await exportTailoredResumeWord(resumeId, content, fileName);
          onAction(`已下载原模板 Word，共写入 ${result.updatedParagraphs} 个修改段落`);
        } catch (exportError) {
          onAction(exportError instanceof Error ? exportError.message : "原模板 Word 导出失败，请重试");
        } finally {
          setIsExporting(false);
        }
      }}
    >
      {isExporting ? "正在生成 Word…" : "下载原模板 Word"}
    </button>
  );
}

export function ResumePanel({
  job,
  resumes,
  selectedResumeId,
  templateReady,
  analysis,
  onSelectResume,
  onAnalysis,
  onResetAnalysis,
  onSaveVersion,
  onOpenResumeCenter,
  onAction,
}: {
  job: JobRecord;
  resumes: ResumeSource[];
  selectedResumeId: string;
  templateReady: boolean;
  analysis?: ResumeAnalysis;
  onSelectResume: (resumeId: string) => void;
  onAnalysis: (analysis: ResumeAnalysis) => void;
  onResetAnalysis: () => void;
  onSaveVersion: (analysis: ResumeAnalysis, content: string) => void;
  onOpenResumeCenter: () => void;
  onAction: (message: string) => void;
}) {
  const selectedResume = resumes.find((resume) => resume.id === selectedResumeId);
  const masterResume = selectedResume?.content ?? "";
  const [tailoredResume, setTailoredResume] = useState(() => buildTailoredResume(masterResume, analysis));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [signInPath, setSignInPath] = useState("");

  const analyze = async () => {
    setError("");
    setSignInPath("");
    if (!job.rawJd) {
      setError("这个岗位没有保存原始 JD，请先用“粘贴 JD 文本”收录一个真实岗位。");
      return;
    }
    if (masterResume.trim().length < 80) {
      setError("所选简历正文不足，请在简历中心补充或改选一份较完整的简历。");
      return;
    }
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/optimize-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: masterResume.trim(), jdText: job.rawJd }),
      });
      const payload = await response.json() as {
        analysis?: Omit<ResumeAnalysis, "accepted">;
        error?: string;
        signInPath?: string;
      };
      if (response.status === 401) {
        const returnTo = `/jobs/${job.id}?tab=resume`;
        window.localStorage.setItem(LOCAL_KEYS.returnJob, job.id);
        const fallbackSignIn = `/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`;
        setSignInPath(payload.signInPath ?? fallbackSignIn);
        setError(payload.error ?? "请先登录再分析。");
        return;
      }
      if (!response.ok || !payload.analysis) throw new Error(payload.error || "分析失败");
      const nextAnalysis = { ...payload.analysis, accepted: [] };
      onAnalysis(nextAnalysis);
      setTailoredResume(masterResume);
      onAction(`已完成当前 JD 与“${selectedResume?.name ?? "所选简历"}”的匹配分析`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "AI 简历分析暂时不可用，请稍后重试。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggle = (index: number) => {
    if (!analysis) return;
    const suggestion = analysis.suggestions[index];
    const wasAccepted = analysis.accepted.includes(index);
    const accepted = wasAccepted
      ? analysis.accepted.filter((item) => item !== index)
      : [...analysis.accepted, index];
    if (suggestion) {
      setTailoredResume((content) => {
        if (wasAccepted && content.includes(suggestion.revised)) {
          return content.replace(suggestion.revised, suggestion.original);
        }
        if (!wasAccepted && content.includes(suggestion.original)) {
          return content.replace(suggestion.original, suggestion.revised);
        }
        return content;
      });
    }
    onAnalysis({ ...analysis, accepted });
  };

  if (!job.rawJd) {
    return (
      <div className="resume-empty-state card">
        <span className="resume-empty-icon">简</span>
        <h2>当前岗位缺少真实 JD</h2>
        <p>
          {resumes.length
            ? `简历中心已读取 ${resumes.length} 份简历；但这个示例岗位没有保存 JD 原文，因此暂时不能开始匹配。`
            : "这个示例岗位没有保存 JD 原文，因此暂时不能开始匹配。"}
        </p>
        <small>请通过右上角“新建岗位”，使用“粘贴 JD 文本”收录真实岗位后再分析。</small>
      </div>
    );
  }

  if (!analysis) {
    if (!resumes.length) {
      return (
        <div className="resume-empty-state card">
          <span className="resume-empty-icon">简</span>
          <h2>先在简历中心添加简历</h2>
          <p>简历只需上传一次。之后每个岗位都可以从简历库选择，不需要重复粘贴。</p>
          <button className="primary-button" onClick={onOpenResumeCenter}>前往简历中心 →</button>
        </div>
      );
    }

    return (
      <div className="panel-stack">
        <div className="section-header-row">
          <div><span className="kicker">选择分析底稿</span><h2>为当前岗位选择一份简历</h2><p>简历来自简历中心；系统会记住这个岗位的选择，不需要重复上传。</p></div>
        </div>
        <section className="card resume-source-card">
          <label className="resume-source-select">
            <span>用于本岗位分析的简历</span>
            <select
              value={selectedResumeId}
              onChange={(event) => onSelectResume(event.target.value)}
              aria-label="本岗位分析简历"
            >
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>{resume.name}</option>
              ))}
            </select>
          </label>
          <button className="text-button" onClick={onOpenResumeCenter}>管理简历库</button>
          {selectedResume && (
            <div className="resume-source-file">
              <span>W</span>
              <div><strong>{selectedResume.name}</strong><small>{selectedResume.content.length.toLocaleString()} 字 · 从简历中心读取</small></div>
            </div>
          )}
          <div className="resume-consent-line"><span>▣</span><p><strong>本地优先</strong>：正文保存在当前浏览器；只有点击分析时，当前 JD 与所选简历才会临时发送给模型，服务端不保存。</p></div>
          {error && (
            <div className="resume-analysis-error" role="alert">
              <strong>{error}</strong>
              {signInPath && <button className="primary-button" onClick={() => window.location.assign(signInPath)}>使用 ChatGPT 登录</button>}
            </div>
          )}
          <div className="resume-import-actions">
            <button className="primary-button" disabled={isAnalyzing} onClick={analyze}>{isAnalyzing ? "正在拆解 JD 并盘点全简历亮点…" : "开始两阶段 AI 分析 →"}</button>
          </div>
        </section>
      </div>
    );
  }

  const gapAsks = mergeGapAsks(analysis.gaps, analysis.questions);

  return (
    <div className="panel-stack">
      <div className="section-header-row">
        <div><span className="kicker">岗位专属版本</span><h2>左侧确认建议，右侧同步编辑</h2><p>采纳建议会立即写入右侧副本；你也可以继续直接修改。主简历不会被覆盖。</p></div>
        <div className="header-buttons">
          <button className="secondary-button" onClick={onResetAnalysis}>重新分析</button>
          <TemplateWordExportButton
            resumeId={selectedResumeId}
            content={tailoredResume}
            fileName={`${job.company}-${job.title}-岗位专属简历.docx`}
            templateReady={templateReady}
            onAction={onAction}
          />
          <button className="secondary-button" onClick={() => {
            const opened = exportResumePdf(tailoredResume, `${job.company}-${job.title}-岗位专属简历`);
            onAction(opened ? "已打开纯文本打印窗口；如需保留原排版，请下载 Word 后另存为 PDF" : "浏览器拦截了打印窗口，请允许弹窗后重试");
          }}>纯文本 PDF</button>
          <button className="primary-button" disabled={tailoredResume.trim().length < 80} onClick={() => onSaveVersion(analysis, tailoredResume.trim())}>完成修改并保存版本</button>
        </div>
      </div>

      <section className="resume-analysis-overview card">
        <div><span>分析结论 · {selectedResume?.name}</span><strong>{analysis.summary}</strong></div>
        <div className="analysis-counts">
          <span><b>{analysis.matches.length}</b> 已匹配</span>
          <span><b>{analysis.suggestions.length}</b> 修改建议</span>
          <span><b>{gapAsks.length}</b> 缺口与追问</span>
        </div>
      </section>

      <div className="resume-strategy-grid">
        <section className="card strategy-card">
          <div className="strategy-card-heading"><span>第一阶段</span><h3>JD 能力优先级</h3></div>
          {analysis.jdPriorities.length ? analysis.jdPriorities.map((item) => (
            <article key={`${item.title}-${item.jdEvidence}`}>
              <div><b className={`priority-badge priority-${item.priority}`}>{item.priority}</b><strong>{item.title}</strong></div>
              <p>{item.interpretation}</p>
              <small>JD：“{item.jdEvidence}”</small>
            </article>
          )) : <p className="empty-finding">暂未提取到可靠的岗位优先级。</p>}
        </section>
        <section className="card strategy-card">
          <div className="strategy-card-heading"><span>第一阶段</span><h3>原简历可放大的亮点</h3></div>
          {analysis.highlights.length ? analysis.highlights.map((item) => (
            <article key={`${item.title}-${item.sourceEvidence.join("-")}`}>
              <strong>{item.title}</strong>
              <p>{item.value}</p>
              {item.transferableSkills.length > 0 && (
                <div className="skill-chip-row">{item.transferableSkills.map((skill) => <span key={skill}>{skill}</span>)}</div>
              )}
              {item.sourceEvidence.map((evidence) => <small key={evidence}>简历：“{evidence}”</small>)}
            </article>
          )) : <p className="empty-finding">暂未提取到可核对的独特亮点。</p>}
        </section>
      </div>

      <div className="resume-findings-grid">
        <section className="card grounded-findings">
          <h3>已被简历证明</h3>
          {analysis.matches.length ? analysis.matches.map((item) => (
            <article key={`${item.title}-${item.resumeEvidence.join("-")}`}>
              <strong>{item.title}</strong>
              <p>{item.explanation}</p>
              {item.resumeEvidence.map((evidence) => <small key={evidence}>简历：“{evidence}”</small>)}
              <small>JD：“{item.jdEvidence}”</small>
            </article>
          )) : <p className="empty-finding">暂未找到可以可靠确认的匹配项。</p>}
        </section>
        <section className="card gap-findings">
          <h3>证据缺口与追问</h3>
          <p className="gap-asks-lead">同一缺口只列一次；追问不会被自动写进简历，确认事实后再进入下一轮。</p>
          {gapAsks.length ? gapAsks.map((item) => (
            <article key={`${item.title}-${item.question || item.reason}-${item.jdEvidence}`}>
              <strong>{item.title}</strong>
              <p>{item.reason}</p>
              {item.jdEvidence ? <small>JD：“{item.jdEvidence}”</small> : null}
              {item.question ? <em>追问：{item.question}</em> : null}
            </article>
          )) : <p className="empty-finding">没有发现需要单独提示的证据缺口。</p>}
        </section>
      </div>

      <div className="resume-layout">
        <div className="suggestion-list">
          {analysis.suggestions.map((item, index) => (
            <article className={analysis.accepted.includes(index) ? "suggestion-card accepted" : "suggestion-card"} key={`${item.title}-${item.original}`}>
              <div className="suggestion-top"><span>建议 {index + 1}</span><b className={`priority-badge priority-${item.priority}`}>{item.priority}</b><i>{item.rewriteType}</i><strong>{item.title}</strong><button onClick={() => toggle(index)}>{analysis.accepted.includes(index) ? "已采纳 ✓" : "采纳建议"}</button></div>
              <div className="diff-block old"><span>原表述</span><p>{item.original}</p></div>
              <div className="diff-block new"><span>建议表述</span><textarea value={item.revised} onChange={(event) => {
                const previousRevision = item.revised;
                const suggestions = analysis.suggestions.map((suggestion, suggestionIndex) => (
                  suggestionIndex === index ? { ...suggestion, revised: event.target.value } : suggestion
                ));
                if (analysis.accepted.includes(index)) {
                  setTailoredResume((content) => content.includes(previousRevision)
                    ? content.replace(previousRevision, event.target.value)
                    : content);
                }
                onAnalysis({ ...analysis, suggestions });
              }} aria-label={`建议 ${index + 1} 的修改后表述`} /></div>
              <div className="suggestion-reason"><strong>为什么改</strong><p>{item.reason}</p></div>
              <details className="suggestion-evidence-details">
                <summary>查看用于重写的 {item.sourceEvidence.length} 处简历证据</summary>
                {item.sourceEvidence.map((evidence) => <p key={evidence}>“{evidence}”</p>)}
                {item.qualityCheck && <small>质量自检：{item.qualityCheck}</small>}
              </details>
              <div className="evidence-line"><span>JD 依据</span>“{item.jdEvidence}”<b>已绑定原文·待确认</b></div>
            </article>
          ))}
          {!analysis.suggestions.length && <div className="resume-empty-suggestions card"><strong>没有生成可安全写入的修改建议</strong><p>系统宁可留空，也不会用缺少原文依据的内容改写简历。</p></div>}
        </div>
        <aside className="resume-editor-preview card">
          <div className="resume-editor-heading"><div><span>岗位专属简历草稿</span><strong>实时同步</strong></div><small>{tailoredResume.length.toLocaleString()} 字</small></div>
          <textarea value={tailoredResume} onChange={(event) => setTailoredResume(event.target.value)} aria-label="岗位专属简历完整编辑框" />
          <div className="resume-editor-footer">
            <span>已采纳 {analysis.accepted.length} / {analysis.suggestions.length} 条建议</span>
            <small>{templateReady ? "可直接编辑 · 可回写原 Word 模板" : "可直接编辑 · 重新导入原 Word 后可保留模板导出"}</small>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function ResumeCenter({
  resumes,
  templateResumeIds,
  versions,
  onResumeChange,
  onResumeImport,
  onOpenJob,
  onClear,
  onAction,
}: {
  resumes: ResumeSource[];
  templateResumeIds: string[];
  versions: ResumeVersion[];
  onResumeChange: (resumeId: string, value: string) => void;
  onResumeImport: (resume: ResumeSource) => void;
  onOpenJob: (jobId: string) => void;
  onClear: () => void;
  onAction: (message: string) => void;
}) {
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [activeResumeId, setActiveResumeId] = useState(resumes[0]?.id ?? "");
  const activeResume = resumes.find((resume) => resume.id === activeResumeId) ?? resumes[0];

  return (
    <div className="resume-center-page">
      <section className="list-heading">
        <div><span className="kicker">设备本地简历库</span><h1>简历中心</h1><p>一次上传多份求职简历；进入岗位后选择其中一份进行分析。</p></div>
        <button className="quiet-danger-button" onClick={onClear}>清除本地简历数据</button>
      </section>

      <div className="resume-center-grid">
        <section className="card master-resume-card">
          <div className="card-heading"><div><span className="kicker">原始简历</span><h2>{resumes.length} 份简历</h2></div><span className="local-only-badge">仅当前浏览器</span></div>
          <div className="word-import-box">
            <div><span className="word-file-icon">W</span><div><strong>添加一份 Word 简历</strong><small>可分别上传产品、运营、法务等版本；原文件不上传服务器</small></div></div>
            <label className="secondary-button">
              {isImporting ? "正在解析…" : "＋ 添加 Word"}
              <input
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                disabled={isImporting}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  if (!file.name.toLowerCase().endsWith(".docx")) {
                    setImportMessage("当前只支持 .docx；旧版 .doc 请先在 Word 中另存为 .docx。");
                    return;
                  }
                  setIsImporting(true);
                  setImportMessage("");
                  try {
                    const mammoth = await import("mammoth");
                    const arrayBuffer = await file.arrayBuffer();
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    const content = result.value.trim();
                    if (content.length < 80) throw new Error("Word 中可读取的简历正文不足 80 字。");
                    const resumeId = `resume-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                    await saveResumeTemplate(resumeId, file, content);
                    onResumeImport({
                      id: resumeId,
                      name: file.name,
                      content,
                      createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
                    });
                    setActiveResumeId(resumeId);
                    setImportMessage(`已读取 ${content.length.toLocaleString()} 字，并在当前浏览器保存原 Word 模板。`);
                  } catch (importError) {
                    setImportMessage(importError instanceof Error ? importError.message : "Word 解析失败，请重试。");
                  } finally {
                    setIsImporting(false);
                  }
                }}
              />
            </label>
          </div>
          {importMessage && <p className="word-import-message" role="status">{importMessage}</p>}
          {resumes.length ? (
            <>
              <div className="resume-library-tabs" role="tablist" aria-label="原始简历列表">
                {resumes.map((resume) => (
                  <button
                    key={resume.id}
                    className={resume.id === activeResume?.id ? "active" : ""}
                    onClick={() => setActiveResumeId(resume.id)}
                    role="tab"
                    aria-selected={resume.id === activeResume?.id}
                  >
                    <strong>{resume.name}</strong>
                    <small>{templateResumeIds.includes(resume.id) ? "原模板已保存" : "仅文字版本"}</small>
                  </button>
                ))}
              </div>
              {activeResume && (
                <>
                  <textarea
                    value={activeResume.content}
                    onChange={(event) => onResumeChange(activeResume.id, event.target.value)}
                    placeholder="导入 .docx 后会在这里显示提取结果。"
                    aria-label={`编辑简历：${activeResume.name}`}
                  />
                  <div className="master-resume-footer">
                    <span>{activeResume.content.length.toLocaleString()} 字 · 自动保存到本地 · 可被所有岗位选择</span>
                    <button className="secondary-button" onClick={() => onAction(`${activeResume.name} 已保存在当前浏览器`)}>确认保存</button>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="resume-version-empty"><span>W</span><strong>还没有原始简历</strong><p>添加一份 `.docx` 后，所有真实岗位都可以选择它进行分析。</p></div>
          )}
        </section>

        <section className="card resume-version-list">
          <div className="card-heading"><div><span className="kicker">岗位专属版本</span><h2>{versions.length} 个版本</h2></div></div>
          {versions.length ? versions.map((version) => {
            const sourceResumeId = version.sourceResumeId ?? resumes[0]?.id ?? "";
            return (
            <article key={version.id}>
              <div className="version-mark">简</div>
              <div><strong>{version.name}</strong><span>{version.createdAt} · 来源：{version.sourceResumeName ?? "旧版主简历"} · 采纳 {version.acceptedCount} 条建议</span></div>
              <div className="version-actions">
                <TemplateWordExportButton
                  resumeId={sourceResumeId}
                  content={version.content}
                  fileName={`${version.name}.docx`}
                  templateReady={templateResumeIds.includes(sourceResumeId)}
                  onAction={onAction}
                />
                <button className="text-button" onClick={() => {
                const opened = exportResumePdf(version.content, version.name);
                onAction(opened ? "已打开纯文本打印窗口；保留模板请使用 Word 导出" : "浏览器拦截了打印窗口，请允许弹窗后重试");
              }}>纯文本 PDF</button><button className="text-button" onClick={() => onOpenJob(version.jobId)}>返回岗位</button></div>
              <details><summary>查看版本正文</summary><p>{version.content}</p></details>
            </article>
          )}) : (
            <div className="resume-version-empty"><span>□</span><strong>还没有岗位专属版本</strong><p>先收录一份真实 JD，再到岗位工作区完成简历匹配。</p></div>
          )}
        </section>
      </div>
    </div>
  );
}

export function LetterPanel({ onAction }: { onAction: (message: string) => void }) {
  const [mode, setMode] = useState<"cover" | "email">("cover");
  return (
    <div className="panel-stack">
      <div className="section-header-row">
        <div><span className="kicker">岗位专属文案</span><h2>求职文案</h2><p>根据 JD 与已确认的简历事实生成，可继续编辑。</p></div>
        <div className="segmented"><button className={mode === "cover" ? "active" : ""} onClick={() => setMode("cover")}>Cover Letter</button><button className={mode === "email" ? "active" : ""} onClick={() => setMode("email")}>邮件正文</button></div>
      </div>
      <div className="writing-layout">
        <section className="writing-card">
          <div className="writing-toolbar"><span>{mode === "cover" ? "Cover Letter · 中文简洁版" : "求职邮件 · 校招投递版"}</span><div><button onClick={() => onAction("已复制到剪贴板")}>复制</button><button onClick={() => onAction("已重新生成一版")}>重新生成</button></div></div>
          {mode === "cover" ? (
            <div className="letter-copy" contentEditable suppressContentEditableWarning>
              <p>尊敬的招聘团队：</p>
              <p>您好！我希望申请字节跳动商业产品运营岗位。我对这一职位的兴趣，来自过去两段围绕用户洞察、增长实验与跨团队项目推进的经历。</p>
              <p>在美团用户运营实习中，我归类了 300 余条用户反馈并搭建问题标签体系，识别出影响留存的核心节点，推动产品侧采纳了 3 项迭代建议。在校园增长项目中，我进一步通过报名与到场数据拆解转化漏斗，使活动到场率提升 21%。这些经历让我逐步形成了从数据发现问题、提出策略到协同落地的工作方法。</p>
              <p>我期待把这套方法应用于商业化产品场景，并在更复杂的业务协作中持续成长。感谢您的阅读，期待有机会进一步交流。</p>
            </div>
          ) : (
            <div className="letter-copy" contentEditable suppressContentEditableWarning>
              <p><strong>主题：应聘商业产品运营（2027 届校招）— 林然</strong></p>
              <p>您好，我是林然，目前就读于复旦大学新闻传播专业，申请贵司商业产品运营岗位。</p>
              <p>我具备用户研究、数据复盘和跨团队项目推进经验。在美团实习期间，我通过 300+ 条反馈定位用户流失节点；在校园项目中，通过优化转化链路使活动到场率提升 21%。随信附上简历，期待进一步沟通。</p>
              <p>感谢您的时间！</p>
            </div>
          )}
          <div className="writing-footer"><span>内容可直接编辑 · 事实引用 4 处</span><button className="primary-button" onClick={() => onAction("已保存最终采用版本")}>保存最终版本</button></div>
        </section>
        <aside className="tone-card card"><h3>生成设置</h3><label>语气<select defaultValue="专业自然"><option>专业自然</option><option>简洁直接</option><option>积极热情</option></select></label><label>长度<select defaultValue="标准"><option>精简</option><option>标准</option><option>详细</option></select></label><div className="fact-check"><span>✓</span><div><strong>事实检查通过</strong><small>未发现超出个人档案的表述</small></div></div></aside>
      </div>
    </div>
  );
}

export function ProgressPanel({ status, setStatus, onAction }: { status: string; setStatus: (status: string) => void; onAction: (message: string) => void }) {
  const steps = ["收藏", "准备中", "待投递", "已投递", "面试中", "Offer"];
  const currentIndex = Math.max(steps.indexOf(status), 0);
  return (
    <div className="panel-stack">
      <div className="section-header-row"><div><span className="kicker">申请时间线</span><h2>投递进度</h2><p>每次状态变化都会保留，方便后续复盘。</p></div><button className="primary-button" onClick={() => onAction("已打开新增进展窗口")}>＋ 记录新进展</button></div>
      <section className="card pipeline-card">
        <div className="pipeline">
          {steps.map((step, index) => <button key={step} className={index <= currentIndex ? "pipeline-step done" : "pipeline-step"} onClick={() => setStatus(step)}><span>{index < currentIndex ? "✓" : index + 1}</span><strong>{step}</strong></button>)}
        </div>
      </section>
      <div className="progress-layout">
        <section className="card timeline-card"><h3>最近动态</h3><div className="timeline-item"><span className="timeline-dot current" /><div><strong>开始准备岗位材料</strong><small>今天 14:32 · 系统自动记录</small><p>已完成 JD 分析，并生成岗位专属简历草稿。</p></div></div><div className="timeline-item"><span className="timeline-dot" /><div><strong>从官网保存岗位</strong><small>今天 14:18 · Chrome 插件</small><p>已保存岗位链接、原始 JD 和招聘渠道。</p></div></div></section>
        <aside className="card followup-card"><h3>下一步事项</h3><label><input type="checkbox" />确认 3 条简历修改建议</label><label><input type="checkbox" />在官网完成网申</label><label><input type="checkbox" />投递后补充日期</label><button className="secondary-button full" onClick={() => onAction("已添加提醒")}>添加截止日期</button></aside>
      </div>
    </div>
  );
}

export function InterviewPanel({ onAction }: { onAction: (message: string) => void }) {
  return (
    <div className="panel-stack">
      <div className="section-header-row"><div><span className="kicker">为这个岗位训练</span><h2>面试准备</h2><p>结合 JD、简历与真实来源建立个性化题库。</p></div><button className="primary-button" onClick={() => onAction("模拟面试将在 P1 版本开放")}>开始模拟面试</button></div>
      <div className="interview-grid">
        <section className="card readiness-card"><div className="readiness-score"><strong>64</strong><span>准备度</span></div><div><h3>建议先补充商业化理解</h3><p>你的经历证据充足，但对广告产品和客户场景的表达还不够具体。</p><div className="skill-bars"><label><span>岗位经历匹配</span><i><b style={{ width: "82%" }} /></i><strong>82</strong></label><label><span>案例表达</span><i><b style={{ width: "72%" }} /></i><strong>72</strong></label><label><span>商业化理解</span><i><b style={{ width: "38%" }} /></i><strong>38</strong></label></div></div></section>
        <section className="card question-card"><div className="small-card-title"><strong>推荐先练</strong><span>6 题</span></div><button><span>01</span><div><strong>请用一个案例说明你如何通过数据发现问题。</strong><small>来源：JD + 个人简历</small></div><b>→</b></button><button><span>02</span><div><strong>如果新功能使用率低，你会如何定位原因？</strong><small>来源：AI 生成 · 岗位能力模型</small></div><b>→</b></button><button><span>03</span><div><strong>跨团队意见不一致时，你如何推动项目？</strong><small>来源：历史面试题 · 用户已确认</small></div><b>→</b></button></section>
        <section className="card import-card"><span className="import-icon">＋</span><h3>导入面试经验</h3><p>粘贴经验帖链接或文本，生成带出处的真题。</p><button className="secondary-button" onClick={() => onAction("已打开真题导入窗口")}>导入真题来源</button><small>外部内容会保留原始链接和导入时间</small></section>
      </div>
    </div>
  );
}
