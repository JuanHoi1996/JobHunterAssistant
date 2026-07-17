"use client";

import { useMemo, useState } from "react";

type TabId = "overview" | "resume" | "letter" | "progress" | "interview";

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

const jobs = [
  { company: "字", title: "商业产品运营", meta: "准备中", tone: "blue" },
  { company: "米", title: "法务培训生", meta: "已投递", tone: "orange" },
  { company: "美", title: "用户运营", meta: "待投递", tone: "green" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [status, setStatus] = useState("准备中");
  const [toast, setToast] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const activeLabel = useMemo(
    () => tabs.find((tab) => tab.id === activeTab)?.label ?? "岗位概览",
    [activeTab],
  );

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
            <button className={item.active ? "nav-item active" : "nav-item"} key={item.label}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-section">
          <div className="section-label">
            <span>最近岗位</span>
            <button aria-label="添加岗位">＋</button>
          </div>
          <div className="recent-jobs">
            {jobs.map((job, index) => (
              <button className={index === 0 ? "recent-job selected" : "recent-job"} key={job.title}>
                <span className={`mini-logo ${job.tone}`}>{job.company}</span>
                <span className="recent-copy">
                  <strong>{job.title}</strong>
                  <small>{job.meta}</small>
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
            <span>岗位管理</span><b>/</b><strong>{activeLabel}</strong>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="搜索">⌕</button>
            <button className="icon-button notification" aria-label="通知">○<i /></button>
            <button className="primary-button compact" onClick={() => showToast("已打开新建岗位窗口")}>＋ 新建岗位</button>
          </div>
        </header>

        <section className="job-hero">
          <div className="company-logo">字</div>
          <div className="job-title-block">
            <div className="eyebrow-line">
              <span className="channel-pill">官网校招</span>
              <span>更新于 12 分钟前</span>
            </div>
            <h1>商业产品运营（2027 届校招）</h1>
            <div className="job-meta">
              <strong>字节跳动</strong><span>上海</span><span>全职</span><span>产品 / 运营</span>
            </div>
          </div>
          <div className="hero-controls">
            <label className="status-select">
              <span className={`status-dot ${status === "已投递" ? "sent" : ""}`} />
              <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="投递状态">
                <option>收藏</option>
                <option>准备中</option>
                <option>待投递</option>
                <option>已投递</option>
                <option>面试中</option>
                <option>Offer</option>
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
          {activeTab === "overview" && <Overview onAction={showToast} onOpenTab={setActiveTab} />}
          {activeTab === "resume" && <ResumePanel onAction={showToast} />}
          {activeTab === "letter" && <LetterPanel onAction={showToast} />}
          {activeTab === "progress" && <ProgressPanel status={status} setStatus={setStatus} onAction={showToast} />}
          {activeTab === "interview" && <InterviewPanel onAction={showToast} />}
        </div>
      </main>

      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </div>
  );
}

function Overview({ onAction, onOpenTab }: { onAction: (message: string) => void; onOpenTab: (tab: TabId) => void }) {
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
          <div className="source-content"><span className="source-logo">字</span><div><strong>字节跳动校园招聘</strong><small>jobs.bytedance.com · JD 已同步</small></div></div>
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
