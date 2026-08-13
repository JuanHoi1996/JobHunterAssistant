/**
 * Collapse duplicate gap/question pairs into one Step-1 list.
 * Prefer gap rows (reason + embedded question); append orphan questions only.
 */
export function mergeGapAsks(gaps, questions) {
  const items = [];
  const seenQuestions = new Set();

  for (const gap of gaps) {
    const question = (gap.question || "").trim();
    if (question) seenQuestions.add(question);
    items.push({
      title: gap.title,
      reason: gap.reason,
      question,
      jdEvidence: gap.jdEvidence || "",
      from: "gap",
    });
  }

  for (const item of questions) {
    const question = item.question.trim();
    if (!question || seenQuestions.has(question)) continue;
    const alreadyEmbedded = items.some((row) => {
      if (!row.question) return false;
      return row.question.includes(question) || question.includes(row.question);
    });
    if (alreadyEmbedded) continue;
    seenQuestions.add(question);
    items.push({
      title: "待补充事实",
      reason: item.why,
      question,
      jdEvidence: item.jdEvidence || "",
      from: "question-only",
    });
  }

  return items;
}
