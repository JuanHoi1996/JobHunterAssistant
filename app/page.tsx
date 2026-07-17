"use client";

import { useMemo, useState } from "react";
import { parseJobText } from "./job-parser.js";

type TabId = "overview" | "resume" | "letter" | "progress" | "interview";
type ScreenId = "list" | "detail";
type JobStatus = "待投递" | "已投递" | "面试中" | "Offer" | "已结束";
type CaptureMethod = "岗位链接" | "JD 文本" | "岗位截图" | "插件保存";

type JobRecord = {
  id: string;
  mark: string;
  tone: "blue" | "orange" | "green" | "violet";
  company: string;
  title: string;
  location: string;
  employment: string;
  category: string;
  discoverySource: string;
  captureMethod: CaptureMethod;
  sourceHost: string;
  status: JobStatus;
  savedLabel: string;
  ageHours: number;
  materials: string;
  applicationMethod?: string;
  jdSummary?: string;
  rawJd?: string;
  contactEmail?: string;
  ccEmail?: string;
  business?: string;
};

const tabs: { id: TabId; label: string; count?: number }[] = [
  { id: "overview", label: "岗位概览" },
  { id: "resume", label: "简历定制", count: 3 },
  { id: "letter", label: "求职文案", count: 2 },
  { id: "progress", label: "投递进度" },
  { id: "interview", label: "面试准备" },
];

const navItems = [
  { icon: "⌂", label: "今日看板" },
  { icon: "▤", label: "岗位管理", active: true, badge: "12" },
  { icon: "▱", label: "简历中心" },
  { icon: "◎", label: "面试中心" },
  { icon: "◇", label: "个人档案" },
];

const initialJobs: JobRecord[] = [
  {
    id: "bytedance-ops",
    mark: "字",
    tone: "blue",
    company: "字节跳动",
    title: "商业产品运营（2027 届校招）",
    location: "上海",
    employment: "全职",
    category: "产品 / 运营",
    discoverySource: "企业官网",
    captureMethod: "岗位链接",
    sourceHost: "jobs.bytedance.com",
    status: "待投递",
    savedLabel: "今天 10:42",
    ageHours: 4,
    materials: "简历已优化 · 文案待确认",
  },
  {
    id: "meituan-user-ops",
    mark: "美",
    tone: "green",
    company: "美团",
    title: "用户运营实习生",
    location: "北京",
    employment: "实习",
    category: "运营",
    discoverySource: "微信公众号",
    captureMethod: "岗位截图",
    sourceHost: "岗位截图",
    status: "待投递",
    savedLabel: "昨天 08:30",
    ageHours: 31,
    materials: "JD 已分析 · 简历待优化",
  },
  {
    id: "xiaomi-legal",
    mark: "米",
    tone: "orange",
    company: "小米",
    title: "法务培训生",
    location: "北京",
    employment: "全职",
    category: "法务",
    discoverySource: "学校就业网",
    captureMethod: "JD 文本",
    sourceHost: "学校就业网",
    status: "已投递",
    savedLabel: "7 月 15 日",
    ageHours: 52,
    materials: "岗位专属简历 V1",
    applicationMethod: "企业官网",
  },
  {
    id: "tencent-product",
    mark: "腾",
    tone: "violet",
    company: "腾讯",
    title: "产品策划培训生",
    location: "深圳",
    employment: "全职",
    category: "产品",
    discoverySource: "朋友推荐",
    captureMethod: "插件保存",
    sourceHost: "join.qq.com",
    status: "面试中",
    savedLabel: "7 月 12 日",
    ageHours: 126,
    materials: "一面复盘已完成",
    applicationMethod: "内推",
  },
];

export default function Home() {
  const [screen, setScreen] = useState<ScreenId>("list");
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [jobRecords, setJobRecords] = useState<JobRecord[]>(initialJobs);
  const [selectedJobId, setSelectedJobId] = useState(initialJobs[0].id);
  const [filter, setFilter] = useState("全部");
  const [newJobOpen, setNewJobOpen] = useState(false);
  const [submittingJobId, setSubmittingJobId] = useState<string | null>(null);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const selectedJob = jobRecords.find((job) => job.id === selectedJobId) ?? jobRecords[0];
  const overdueJobs = jobRecords.filter((job) => job.status === "待投递" && job.ageHours >= 24);
  const filteredJobs = useMemo(
    () => filter === "全部" ? jobRecords : jobRecords.filter((job) => job.status === filter),
    [filter, jobRecords],
  );
  const activeLabel = screen === "list"
    ? "岗位列表"
    : tabs.find((tab) => tab.id === activeTab)?.label ?? "岗位概览";

  const openJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setActiveTab("overview");
    setScreen("detail");
  };

  const updateJobStatus = (jobId: string, status: JobStatus, applicationMethod?: string) => {
    setJobRecords((current) => current.map((job) => (
      job.id === jobId ? { ...job, status, applicationMethod: applicationMethod ?? job.applicationMethod } : job
    )));
  };

  const addJob = (job: JobRecord) => {
    setJobRecords((current) => [job, ...current]);
    setFilter("全部");
    setNewJobOpen(false);
    showToast("岗位已收录，并自动标记为待投递");
  };

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
          {navItems.map((item) => (
            <button
              className={item.active ? "nav-item active" : "nav-item"}
              key={item.label}
              onClick={() => item.label === "岗位管理" && setScreen("list")}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-section">
          <div className="section-label">
            <span>最近岗位</span>
            <button aria-label="添加岗位" onClick={() => setNewJobOpen(true)}>＋</button>
          </div>
          <div className="recent-jobs">
            {jobRecords.slice(0, 3).map((job) => (
              <button
                className={selectedJobId === job.id && screen === "detail" ? "recent-job selected" : "recent-job"}
                key={job.id}
                onClick={() => openJob(job.id)}
              >
                <span className={`mini-logo ${job.tone}`}>{job.mark}</span>
                <span className="recent-copy">
                  <strong>{job.title}</strong>
                  <small>{job.status}</small>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="avatar">林</div>
          <div>
            <strong>林同学</strong>
            <span>档案完整度 86%</span>
          </div>
          <button aria-label="打开设置">•••</button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <button onClick={() => setScreen("list")}>岗位管理</button><b>/</b><strong>{activeLabel}</strong>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="搜索">⌕</button>
            <button className="icon-button notification" aria-label="通知">○<i /></button>
            <button className="primary-button compact" onClick={() => setNewJobOpen(true)}>＋ 新建岗位</button>
          </div>
        </header>

        {screen === "list" ? (
          <JobList
            jobs={filteredJobs}
            allJobs={jobRecords}
            overdueJobs={overdueJobs}
            filter={filter}
            reminderDismissed={reminderDismissed}
            onFilter={setFilter}
            onDismissReminder={() => setReminderDismissed(true)}
            onNew={() => setNewJobOpen(true)}
            onOpen={openJob}
            onMarkSubmitted={setSubmittingJobId}
          />
        ) : (
          <>
            <section className="job-hero">
              <div className={`company-logo ${selectedJob.tone}`}>{selectedJob.mark}</div>
              <div className="job-title-block">
                <div className="eyebrow-line">
                  <span className="channel-pill">来自：{selectedJob.discoverySource}</span>
                  <span>保存于 {selectedJob.savedLabel}</span>
                </div>
                <h1>{selectedJob.title}</h1>
                <div className="job-meta">
                  <strong>{selectedJob.company}</strong><span>{selectedJob.location}</span><span>{selectedJob.employment}</span><span>{selectedJob.category}</span>
                </div>
              </div>
              <div className="hero-controls">
                <label className="status-select">
                  <span className={`status-dot ${selectedJob.status === "已投递" ? "sent" : ""}`} />
                  <select
                    value={selectedJob.status}
                    onChange={(event) => updateJobStatus(selectedJob.id, event.target.value as JobStatus)}
                    aria-label="投递状态"
                  >
                    <option>待投递</option>
                    <option>已投递</option>
                    <option>面试中</option>
                    <option>Offer</option>
                    <option>已结束</option>
                  </select>
                </label>
                <button className="more-button" aria-label="更多操作">•••</button>
              </div>
            </section>

            <div className="tab-bar" role="tablist" aria-label="岗位工作区">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={activeTab === tab.id ? "tab active" : "tab"}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                >
                  {tab.label}
                  {tab.count && <span>{tab.count}</span>}
                </button>
              ))}
            </div>

            <div className="workspace-body">
              {activeTab === "overview" && <Overview job={selectedJob} onAction={showToast} onOpenTab={setActiveTab} />}
              {activeTab === "resume" && <ResumePanel onAction={showToast} />}
              {activeTab === "letter" && <LetterPanel onAction={showToast} />}
              {activeTab === "progress" && (
                <ProgressPanel
                  status={selectedJob.status}
                  setStatus={(nextStatus) => updateJobStatus(selectedJob.id, nextStatus as JobStatus)}
                  onAction={showToast}
                />
              )}
              {activeTab === "interview" && <InterviewPanel onAction={showToast} />}
            </div>
          </>
        )}
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

function JobList({
  jobs,
  allJobs,
  overdueJobs,
  filter,
  reminderDismissed,
  onFilter,
  onDismissReminder,
  onNew,
  onOpen,
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
  onOpen: (jobId: string) => void;
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
                  <strong>{job.discoverySource}</strong>
                  <span>{job.captureMethod} · 保存于 {job.savedLabel}</span>
                  {overdue && <em>已收录 {job.ageHours} 小时</em>}
                </div>
                <div className="material-cell"><span>{job.materials}</span><i><b style={{ width: job.status === "待投递" ? "54%" : "100%" }} /></i></div>
                <div><span className={`status-chip status-${job.status}`}>{job.status}</span>{job.applicationMethod && <small className="application-method">通过{job.applicationMethod}</small>}</div>
                <div className="row-actions">
                  <button className="text-button" onClick={() => onOpen(job.id)}>进入工作区</button>
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

function NewJobDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (job: JobRecord) => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [method, setMethod] = useState<CaptureMethod>("岗位链接");
  const [fileName, setFileName] = useState("");
  const [jobLink, setJobLink] = useState("");
  const [jdText, setJdText] = useState("");
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
  const [recognizedCount, setRecognizedCount] = useState(0);
  const [recognitionMode, setRecognitionMode] = useState<"parsed" | "manual">("manual");
  const [formError, setFormError] = useState("");
  const methods: { id: CaptureMethod; icon: string; title: string; description: string }[] = [
    { id: "岗位链接", icon: "↗", title: "粘贴岗位链接", description: "适合企业官网和公开招聘页面" },
    { id: "JD 文本", icon: "文", title: "粘贴 JD 文本", description: "最稳定的通用导入方式" },
    { id: "岗位截图", icon: "图", title: "上传岗位截图", description: "适合公众号、实习群和登录页面" },
    { id: "插件保存", icon: "插", title: "插件一键保存", description: "读取当前已打开的岗位页面" },
  ];

  const beginRecognition = () => {
    setFormError("");
    setSource("其他");

    if (method === "JD 文本") {
      if (!jdText.trim()) {
        setFormError("请先粘贴岗位 JD 文本。");
        return;
      }
      const result = parseJobText(jdText);
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
      setRecognitionMode("parsed");
      setStep(2);
      return;
    }

    if (method === "岗位链接" && !jobLink.trim()) {
      setFormError("请先粘贴岗位链接。");
      return;
    }
    if (method === "岗位截图" && !fileName) {
      setFormError("请先选择一张岗位截图。");
      return;
    }

    setCompany("");
    setTitle("");
    setLocation("");
    setEmployment("");
    setCategory("其他");
    setContactEmail("");
    setCcEmail("");
    setBusiness("");
    setFieldEvidence({ company: "", title: "", location: "", employment: "", category: "", email: "", ccEmail: "" });
    setRecognizedCount(0);
    setRecognitionMode("manual");
    setSummary(
      method === "岗位链接"
        ? "当前公开原型尚未接入网页读取服务，请先手动补充岗位字段；不会使用示例数据代替识别结果。"
        : method === "岗位截图"
          ? "当前公开原型尚未接入图片文字识别，请先手动补充岗位字段；已选择的截图不会被误判为其他岗位。"
          : "当前公开原型尚未与浏览器插件连接，请先手动补充岗位字段。",
    );
    setStep(2);
  };

  const create = () => {
    if (!company.trim() || !title.trim()) {
      setFormError("请至少填写公司名称和岗位名称，再创建岗位记录。");
      return;
    }
    let sourceHost = method;
    if (method === "岗位链接") {
      try {
        sourceHost = new URL(jobLink).hostname || "用户提供的岗位链接";
      } catch {
        sourceHost = "用户提供的岗位链接";
      }
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
      sourceHost,
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
                <button key={item.id} className={method === item.id ? "capture-method active" : "capture-method"} onClick={() => setMethod(item.id)}>
                  <span>{item.icon}</span><strong>{item.title}</strong><small>{item.description}</small><i>{method === item.id ? "✓" : ""}</i>
                </button>
              ))}
            </div>
            <div className="capture-input">
              {method === "岗位链接" && <label><span>岗位链接</span><input value={jobLink} onChange={(event) => setJobLink(event.target.value)} placeholder="粘贴企业官网或招聘平台的公开链接" /></label>}
              {method === "JD 文本" && <label><span>岗位 JD</span><textarea value={jdText} onChange={(event) => setJdText(event.target.value)} placeholder="粘贴完整岗位信息，包含公司、岗位、地点和招聘要求时识别更准确" /></label>}
              {method === "岗位截图" && (
                <label className="upload-zone">
                  <input type="file" accept="image/*" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
                  <span>▧</span><strong>{fileName || "点击选择岗位截图"}</strong><small>支持 PNG、JPG；上传前可先裁剪或打码</small>
                </label>
              )}
              {method === "插件保存" && <div className="extension-note"><span>插</span><div><strong>在岗位页面打开“向前”插件</strong><p>插件只读取当前页面，不需要你的招聘网站密码。</p></div></div>}
            </div>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <div className="privacy-line"><span>✓</span>不会要求招聘网站账号、密码、验证码或 Cookie</div>
            <div className="modal-footer"><button className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" onClick={beginRecognition}>{method === "JD 文本" ? "解析岗位信息" : "继续确认"} →</button></div>
          </>
        ) : (
          <>
            <div className={recognitionMode === "parsed" ? "recognition-summary" : "recognition-summary needs-review"}><span>{recognitionMode === "parsed" ? "✓" : "!"}</span><div><strong>{recognitionMode === "parsed" ? `已从原文提取 ${recognizedCount} 个岗位字段` : "当前方式尚未接入自动读取"}</strong><p>{recognitionMode === "parsed" ? "自动字段均附原文依据；没有依据的字段不会自动填入。" : "请手动补充必填字段；系统不会使用演示数据冒充识别结果。"}</p></div><em>{method}</em></div>
            <div className="confirm-grid">
              <label><span>公司名称 {company ? <b>有原文依据</b> : <em>请补充</em>}</span><input value={company} onChange={(event) => setCompany(event.target.value)} />{fieldEvidence.company && <small className="field-evidence" title={fieldEvidence.company}>依据：“{fieldEvidence.company}”</small>}</label>
              <label><span>岗位名称 {title ? <b>有原文依据</b> : <em>请补充</em>}</span><input value={title} onChange={(event) => setTitle(event.target.value)} />{fieldEvidence.title && <small className="field-evidence" title={fieldEvidence.title}>依据：“{fieldEvidence.title}”</small>}</label>
              <label><span>工作地点 {location ? <b>有原文依据</b> : <em>请核对</em>}</span><input value={location} onChange={(event) => setLocation(event.target.value)} />{fieldEvidence.location && <small className="field-evidence" title={fieldEvidence.location}>依据：“{fieldEvidence.location}”</small>}</label>
              <label><span>工作性质 {employment ? <b>根据原文判断</b> : <em>请核对</em>}</span><select value={employment} onChange={(event) => setEmployment(event.target.value)}><option value="">请选择</option><option>实习</option><option>全职</option><option>兼职</option></select>{fieldEvidence.employment && <small className="field-evidence" title={fieldEvidence.employment}>依据：“{fieldEvidence.employment}”</small>}</label>
              <label><span>岗位类别 <b>根据原文判断</b></span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>产品 / 运营</option><option>运营</option><option>产品</option><option>法务</option><option>其他</option></select>{fieldEvidence.category && <small className="field-evidence" title={fieldEvidence.category}>依据：“{fieldEvidence.category}”</small>}</label>
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

function ApplicationMethodDialog({ job, onClose, onConfirm }: { job: JobRecord; onClose: () => void; onConfirm: (method: string) => void }) {
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

function ImportedJobOverview({ job, onAction, onOpenTab }: { job: JobRecord; onAction: (message: string) => void; onOpenTab: (tab: TabId) => void }) {
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

        <section className="card match-card pending-analysis-card">
          <div className="card-heading">
            <div><span className="kicker">下一步</span><h2>简历匹配尚未开始</h2></div>
          </div>
          <p>岗位字段已经保存。开始简历定制后，再根据这份 JD 和你的真实简历生成匹配分析，当前不展示示例结论。</p>
          <button className="primary-button" onClick={() => onOpenTab("resume")}>去简历定制 →</button>
        </section>
      </div>

      <aside className="right-column">
        <section className="card next-step-card">
          <div className="small-card-title"><span className="spark">✦</span><strong>建议下一步</strong><span>刚刚</span></div>
          <h3>先核对岗位信息</h3>
          <p>确认公司、岗位类别、来源渠道和投递邮箱，再开始制作岗位专属材料。</p>
          <button className="primary-button full" onClick={() => onOpenTab("resume")}>开始准备材料 <span>→</span></button>
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

function Overview({ job, onAction, onOpenTab }: { job: JobRecord; onAction: (message: string) => void; onOpenTab: (tab: TabId) => void }) {
  if (job.rawJd) {
    return <ImportedJobOverview job={job} onAction={onAction} onOpenTab={onOpenTab} />;
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

        <section className="card match-card">
          <div className="card-heading">
            <div>
              <span className="kicker">简历匹配分析</span>
              <h2>你和这个岗位的距离</h2>
            </div>
            <button className="text-button" onClick={() => onOpenTab("resume")}>查看完整建议 →</button>
          </div>
          <div className="match-layout">
            <div className="score-wrap">
              <div className="score-ring"><div><strong>82</strong><span>匹配度</span></div></div>
              <p>高于同类候选人<br /><strong>约 68%</strong></p>
            </div>
            <div className="match-details">
              <div className="match-row success">
                <span className="match-icon">✓</span>
                <div><strong>已被证明的优势</strong><p>用户研究、活动复盘、跨部门协作</p></div>
                <span className="match-count">6 项</span>
              </div>
              <div className="match-row warning">
                <span className="match-icon">!</span>
                <div><strong>建议补强的表达</strong><p>弱化“执行”，突出策略判断与数据结果</p></div>
                <span className="match-count">3 项</span>
              </div>
              <div className="match-row muted">
                <span className="match-icon">–</span>
                <div><strong>暂未提供证据</strong><p>广告商业化产品经验</p></div>
                <span className="match-count">1 项</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <aside className="right-column">
        <section className="card next-step-card">
          <div className="small-card-title"><span className="spark">✦</span><strong>下一步建议</strong><span>今天</span></div>
          <h3>先优化简历，再开始投递</h3>
          <p>3 处经历表述可以更贴合 JD，预计需要 8 分钟。</p>
          <div className="task-progress"><span style={{ width: "66%" }} /></div>
          <div className="task-meta"><span>准备度 2 / 3</span><strong>还差一步</strong></div>
          <button className="primary-button full" onClick={() => onOpenTab("resume")}>开始优化简历 <span>→</span></button>
        </section>

        <section className="card assets-card">
          <div className="small-card-title"><strong>求职材料</strong><button onClick={() => onAction("材料已刷新")}>刷新</button></div>
          <button className="asset-row" onClick={() => onOpenTab("resume")}>
            <span className="file-icon resume">简</span><div><strong>岗位专属简历</strong><small>草稿 V1 · 3 处待确认</small></div><b>→</b>
          </button>
          <button className="asset-row" onClick={() => onOpenTab("letter")}>
            <span className="file-icon letter">信</span><div><strong>Cover Letter</strong><small>已生成 · 286 字</small></div><b>→</b>
          </button>
          <button className="asset-row" onClick={() => onOpenTab("letter")}>
            <span className="file-icon mail">邮</span><div><strong>求职邮件正文</strong><small>尚未生成</small></div><b>＋</b>
          </button>
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

function ResumePanel({ onAction }: { onAction: (message: string) => void }) {
  const [accepted, setAccepted] = useState<number[]>([]);
  const suggestions = [
    { title: "突出策略而非执行", from: "负责校园活动策划与执行，协调多方资源，活动覆盖 1,200 名学生。", to: "基于报名与到场数据拆解转化漏斗，调整渠道策略并协同 4 个团队落地，使活动到场率提升 21%。", source: "校园项目 · 招新增长项目" },
    { title: "补充数据分析过程", from: "定期整理用户反馈，并输出运营周报。", to: "归类 300+ 条用户反馈并搭建问题标签体系，识别核心流失节点，为产品迭代提供 3 项优先级建议。", source: "美团实习 · 用户运营" },
    { title: "强化跨团队推动", from: "参与新功能上线和推广工作。", to: "协同产品、设计与销售完成新功能冷启动，制定首批用户触达方案，两周内获得 460 次有效使用。", source: "课程项目 · SaaS 增长实验" },
  ];

  const toggle = (index: number) => {
    setAccepted((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
  };

  return (
    <div className="panel-stack">
      <div className="section-header-row">
        <div><span className="kicker">岗位专属版本</span><h2>简历修改建议</h2><p>所有建议均来自你的真实经历，接受后才会写入新版本。</p></div>
        <div className="header-buttons"><button className="secondary-button" onClick={() => onAction("已进入简历预览")}>预览简历</button><button className="primary-button" onClick={() => onAction(`岗位专属简历 V1 已保存，采纳 ${accepted.length} 项建议`)}>保存为新版本</button></div>
      </div>
      <div className="resume-layout">
        <div className="suggestion-list">
          {suggestions.map((item, index) => (
            <article className={accepted.includes(index) ? "suggestion-card accepted" : "suggestion-card"} key={item.title}>
              <div className="suggestion-top"><span>建议 {index + 1}</span><strong>{item.title}</strong><button onClick={() => toggle(index)}>{accepted.includes(index) ? "已采纳 ✓" : "采纳建议"}</button></div>
              <div className="diff-block old"><span>原表述</span><p>{item.from}</p></div>
              <div className="diff-block new"><span>建议表述</span><p>{item.to}</p></div>
              <div className="evidence-line"><span>依据</span>{item.source}<b>已核对事实</b></div>
            </article>
          ))}
        </div>
        <aside className="resume-summary card">
          <div className="summary-score"><span>预计匹配度</span><strong>82 <i>→</i> 91</strong></div>
          <div className="mini-divider" />
          <h3>修改原则</h3>
          <ul><li>不新增不存在的经历</li><li>保留数字的事实来源</li><li>针对本岗位调整排序</li></ul>
          <div className="version-box"><span>基于</span><strong>中文主简历 V3</strong><small>更新于 2026-07-15</small></div>
        </aside>
      </div>
    </div>
  );
}

function LetterPanel({ onAction }: { onAction: (message: string) => void }) {
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

function ProgressPanel({ status, setStatus, onAction }: { status: string; setStatus: (status: string) => void; onAction: (message: string) => void }) {
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

function InterviewPanel({ onAction }: { onAction: (message: string) => void }) {
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
