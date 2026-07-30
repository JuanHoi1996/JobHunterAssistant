export function splitResumeParagraphs(text) {
  return String(text ?? "")
    .replace(/\r/gu, "")
    .split(/\n+/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function deriveParagraphUpdates(sourceText, targetText) {
  const source = splitResumeParagraphs(sourceText);
  const target = splitResumeParagraphs(targetText);

  if (source.length !== target.length) {
    throw new Error("右侧简历新增或删除了整段内容，当前无法安全回写原 Word 模板。请保持段落数量不变，或撤销整段增删后重试。");
  }

  return source.flatMap((original, index) => {
    const revised = target[index];
    if (original === revised) return [];

    let prefixLength = 0;
    const prefixLimit = Math.min(original.length, revised.length);
    while (
      prefixLength < prefixLimit
      && original[prefixLength] === revised[prefixLength]
    ) {
      prefixLength += 1;
    }

    let suffixLength = 0;
    const suffixLimit = Math.min(
      original.length - prefixLength,
      revised.length - prefixLength,
    );
    while (
      suffixLength < suffixLimit
      && original[original.length - 1 - suffixLength]
        === revised[revised.length - 1 - suffixLength]
    ) {
      suffixLength += 1;
    }

    return [{
      index,
      sourceParagraph: original,
      targetParagraph: revised,
      sourceOffset: prefixLength,
      oldFragment: original.slice(
        prefixLength,
        suffixLength ? original.length - suffixLength : original.length,
      ),
      newFragment: revised.slice(
        prefixLength,
        suffixLength ? revised.length - suffixLength : revised.length,
      ),
    }];
  });
}

export function normalizeComparableText(text) {
  return String(text ?? "").replace(/\s+/gu, "");
}
