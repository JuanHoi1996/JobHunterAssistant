/**
 * Extracts only information that is explicitly present in pasted JD text.
 * The parser intentionally returns empty strings instead of inventing values.
 */

const firstMatch = (text, pattern) => text.match(pattern)?.[1]?.trim() ?? "";

const cleanLineValue = (value) => value
  .replace(/[；;。]+$/g, "")
  .replace(/\s+/g, " ")
  .trim();

const findLine = (lines, pattern) => lines.find((line) => pattern.test(line)) ?? "";

const normalizeCompanyCandidate = (value, text) => {
  const candidate = cleanLineValue(value)
    .replace(/^[📍📌🔍【\[]+/u, "")
    .replace(/[】\]]+$/u, "")
    .replace(/^(?:招聘|内推)\s*[:：-]?\s*/u, "")
    .trim();
  const knownCompany = candidate.match(/字节跳动|ByteDance|腾讯|阿里巴巴|美团|小米|百度|京东|拼多多|快手|网易|华为/iu)?.[0]
    ?? (!candidate && /(?:@bytedance\.com\b|TikTok|抖音)/iu.test(text) ? "字节跳动" : "");
  if (/ByteDance/iu.test(knownCompany)) return "字节跳动";
  return knownCompany || candidate;
};

const cleanTitle = (value) => cleanLineValue(value)
  .replace(/^急+招(?:继任)?[🔥\s]*/u, "")
  .replace(/[（(]?\s*\d+\s*(?:[-—–~～至到]\s*\d+)?\s*名\s*[）)]?.*$/u, "")
  .replace(/[，,]\s*(?:有留用机会|可留用|急招).*$/u, "")
  .replace(/\s+(?:日常)?实习\s*base\b.*$/iu, "")
  .trim();

const inferEmployment = (text, title) => {
  if (/实习/u.test(`${title}\n${text}`)) return "实习";
  if (/兼职/u.test(`${title}\n${text}`)) return "兼职";
  if (/全职|正式员工|校招|社招/u.test(`${title}\n${text}`)) return "全职";
  return "";
};

const inferCategory = (text, title) => {
  if (/律师事务所|律师|法务|法律|法学|合规|法律职业资格|证券法律/u.test(text)) return "法务";
  if (/产品运营|运营产品/u.test(title)) return "产品 / 运营";
  if (/产品/u.test(title)) return "产品";
  if (/运营/u.test(title)) return "运营";
  if (/产品运营|商业运营|用户运营|内容运营|策略运营/u.test(text)) return "产品 / 运营";
  if (/产品经理|产品策划|产品设计/u.test(text)) return "产品";
  if (/运营/u.test(text)) return "运营";
  return "其他";
};

const buildSummary = ({ company, title, location, business, graduationYear, certificate, duration, email, ccEmail }) => {
  const sentences = [];
  const subject = [company, title && `招聘${title}`].filter(Boolean).join("");
  const opening = [subject, location && `工作地点为${location}`, business && `业务方向为${business}`].filter(Boolean).join("，");
  if (opening) sentences.push(`${opening}。`);

  const requirements = [
    graduationYear && `${graduationYear}年毕业`,
    certificate && "持有法律职业资格证书",
    duration,
  ].filter(Boolean);
  if (requirements.length) sentences.push(`明确要求：${requirements.join("、")}。`);
  if (email) sentences.push(`投递邮箱：${email}。`);
  if (ccEmail) sentences.push(`抄送邮箱：${ccEmail}。`);

  return sentences.join("") || "暂未从原文中提取到可生成摘要的明确字段，请对照原文补充。";
};

export function parseJobText(rawText) {
  const text = String(rawText ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0\u3000]/g, " ")
    .trim();
  const lines = text.split("\n").map(cleanLineValue).filter(Boolean);

  const explicitCompanyLine = findLine(lines, /(?:招聘单位|公司名称|单位名称)\s*[:：]/u);
  const explicitTitleLine = findLine(lines, /(?:招聘职位|招聘岗位|岗位名称|职位名称)\s*[:：]/u);
  const explicitLocationLine = findLine(lines, /(?:工作地点|办公地点|岗位地点)\s*[:：]/u);
  const baseLocationLine = findLine(lines.slice(0, 8), /Base\s*[:：]?\s*(?:北京|上海|深圳|广州|杭州|成都|南京|武汉|西安|苏州|重庆|天津)/iu);

  const headerTitleLine = explicitTitleLine || findLine(
    lines.slice(0, 8),
    /(?:实习生|管培生|培训生|产品经理|工程师|设计师|分析师|专员|顾问|律师|校招)/u,
  );
  const headerTitleIndex = headerTitleLine ? lines.indexOf(headerTitleLine) : -1;
  const headerCompanyLine = !explicitCompanyLine && headerTitleIndex > 0
    ? lines.slice(0, headerTitleIndex).find((line) => (
      line.length <= 50
      && !/^(?:一|二|三|四|五|六|七|八|九|十|\d+)[、.．]/u.test(line)
      && !/(?:岗位|职位|招聘|Base|地点|到岗|入职)/iu.test(line)
      && !/(?:邮箱|更正|更新|补充|通知|说明|备注)/u.test(line)
    )) ?? ""
    : "";

  const explicitCompany = cleanLineValue(firstMatch(text, /(?:^|\n)(?:【[^】]+】\s*)?(?:招聘单位|公司名称|单位名称)\s*[:：]\s*([^\n]+)/u));
  const company = explicitCompany
    ? normalizeCompanyCandidate(explicitCompany, "")
    : normalizeCompanyCandidate(headerCompanyLine, text);
  const explicitTitle = cleanLineValue(firstMatch(text, /(?:^|\n)\s*(?:\d+[、.．]\s*)?(?:招聘职位|招聘岗位|岗位名称|职位名称)\s*[:：]\s*([^\n]+)/u));
  const rawTitle = explicitTitle || headerTitleLine;
  const title = cleanTitle(rawTitle);
  const explicitLocation = cleanLineValue(firstMatch(text, /(?:^|\n)\s*(?:\d+[、.．]\s*)?(?:工作地点|办公地点|岗位地点)\s*[:：]\s*([^\n]+)/u));
  const baseLocation = cleanLineValue(firstMatch(text, /(?:^|\n)[^\n]*?\bBase\s*[:：]?\s*((?:北京|上海|深圳|广州|杭州|成都|南京|武汉|西安|苏州|重庆|天津)(?:市)?)/iu));
  const location = cleanLineValue((explicitLocation || baseLocation)
    .replace(/^📍\s*/u, "")
    .replace(/\s+.*(?:到岗|入职).*$/u, ""));
  const business = cleanLineValue(firstMatch(text, /(?:^|\n)\s*(?:\d+[、.．]\s*)?(?:业务描述|业务方向|岗位方向)\s*[:：]\s*([^\n]+)/u));
  const emails = [...new Set(Array.from(
    text.matchAll(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/giu),
    (match) => match[1],
  ))];
  const primaryEmailLine = findLine(lines, /(?:简历发送至|简历投递|投递方式|投递邮箱|发送至)[^\n]*@/u);
  const ccEmailLine = findLine(lines, /抄送[^\n]*@/u);
  const email = firstMatch(primaryEmailLine, /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/iu) || emails[0] || "";
  const ccEmail = firstMatch(ccEmailLine, /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/iu)
    || emails.find((item) => item !== email)
    || "";
  const graduationYear = firstMatch(text, /\b(20\d{2})\s*年(?:应届)?毕业/u);
  const certificate = /法律职业资格证书|法考(?:通过|证书)|法律职业资格/u.test(text);
  const durationMatch = text.match(/(?:连续)?(?:全职)?实习[^。；;\n]{0,12}?(\d+)\s*个月以上/u);
  const duration = durationMatch ? `可连续实习${durationMatch[1]}个月以上` : "";
  const employment = inferEmployment(text, title);
  const category = inferCategory(text, title);

  const companyEvidence = explicitCompanyLine || headerCompanyLine || (company ? findLine(lines, /TikTok|抖音|字节跳动|ByteDance/iu) : "");
  const evidence = {
    company: companyEvidence,
    title: explicitTitleLine || headerTitleLine,
    location: explicitLocationLine || baseLocationLine,
    employment: headerTitleLine || findLine(lines, /(?:全职|兼职|实习)/u),
    category: headerTitleLine || explicitTitleLine,
    email: primaryEmailLine || findLine(lines, new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "iu")),
    ccEmail: ccEmailLine,
  };

  const result = {
    company,
    title,
    location,
    employment,
    category,
    business,
    email,
    ccEmail,
    emails,
    graduationYear,
    certificate,
    duration,
    evidence,
    summary: "",
    rawText: text,
  };
  result.summary = buildSummary(result);
  return result;
}
