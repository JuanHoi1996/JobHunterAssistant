/**
 * Extracts only information that is explicitly present in pasted JD text.
 * The parser intentionally returns empty strings instead of inventing values.
 */

const firstMatch = (text, pattern) => text.match(pattern)?.[1]?.trim() ?? "";

const cleanLineValue = (value) => value
  .replace(/[；;。]+$/g, "")
  .replace(/\s+/g, " ")
  .trim();

const cleanTitle = (value) => cleanLineValue(value)
  .replace(/[（(]?\s*\d+\s*(?:[-—–~～至到]\s*\d+)?\s*名\s*[）)]?.*$/u, "")
  .replace(/[，,]\s*(?:有留用机会|可留用|急招).*$/u, "")
  .trim();

const inferEmployment = (text, title) => {
  if (/实习/u.test(`${title}\n${text}`)) return "实习";
  if (/兼职/u.test(`${title}\n${text}`)) return "兼职";
  if (/全职|正式员工|校招|社招/u.test(`${title}\n${text}`)) return "全职";
  return "";
};

const inferCategory = (text) => {
  if (/律师事务所|律师|法务|法律|法学|合规|法律职业资格|证券法律/u.test(text)) return "法务";
  if (/产品运营|商业运营|用户运营|内容运营|策略运营/u.test(text)) return "产品 / 运营";
  if (/产品经理|产品策划|产品设计/u.test(text)) return "产品";
  if (/运营/u.test(text)) return "运营";
  return "其他";
};

const buildSummary = ({ company, title, location, business, graduationYear, certificate, duration, email }) => {
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

  return sentences.join("") || "暂未从原文中提取到可生成摘要的明确字段，请对照原文补充。";
};

export function parseJobText(rawText) {
  const text = String(rawText ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0\u3000]/g, " ")
    .trim();

  const company = cleanLineValue(firstMatch(text, /(?:^|\n)(?:【[^】]+】\s*)?(?:招聘单位|公司名称|单位名称)\s*[:：]\s*([^\n]+)/u));
  const rawTitle = cleanLineValue(firstMatch(text, /(?:^|\n)\s*(?:\d+[、.．]\s*)?(?:招聘职位|招聘岗位|岗位名称|职位名称)\s*[:：]\s*([^\n]+)/u));
  const title = cleanTitle(rawTitle);
  const location = cleanLineValue(firstMatch(text, /(?:^|\n)\s*(?:\d+[、.．]\s*)?(?:工作地点|办公地点|岗位地点)\s*[:：]\s*([^\n]+)/u));
  const business = cleanLineValue(firstMatch(text, /(?:^|\n)\s*(?:\d+[、.．]\s*)?(?:业务描述|业务方向|岗位方向)\s*[:：]\s*([^\n]+)/u));
  const email = firstMatch(text, /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/iu);
  const graduationYear = firstMatch(text, /\b(20\d{2})\s*年(?:应届)?毕业/u);
  const certificate = /法律职业资格证书|法考(?:通过|证书)|法律职业资格/u.test(text);
  const durationMatch = text.match(/(?:连续)?(?:全职)?实习[^。；;\n]{0,12}?(\d+)\s*个月以上/u);
  const duration = durationMatch ? `可连续实习${durationMatch[1]}个月以上` : "";
  const employment = inferEmployment(text, title);
  const category = inferCategory(text);

  const result = {
    company,
    title,
    location,
    employment,
    category,
    business,
    email,
    graduationYear,
    certificate,
    duration,
    summary: "",
    rawText: text,
  };
  result.summary = buildSummary(result);
  return result;
}
