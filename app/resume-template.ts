import {
  deriveParagraphUpdates,
  normalizeComparableText,
  splitResumeParagraphs,
} from "./docx-template.js";

const DB_NAME = "xiangqian-local-documents";
const DB_VERSION = 1;
const STORE_NAME = "resume-templates";
const MASTER_TEMPLATE_ID = "master-resume";
const WORD_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

type ResumeTemplateRecord = {
  id: string;
  fileName: string;
  sourceText: string;
  file: Blob;
  savedAt: string;
};

type ExportResult = {
  fileName: string;
  updatedParagraphs: number;
};

const openTemplateDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = window.indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME, { keyPath: "id" });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error("无法打开本地 Word 模板库。"));
});

const runStoreRequest = async <T>(
  mode: IDBTransactionMode,
  execute: (store: IDBObjectStore) => IDBRequest<T>,
) => {
  const database = await openTemplateDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = execute(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("本地 Word 模板操作失败。"));
      transaction.onabort = () => reject(transaction.error ?? new Error("本地 Word 模板操作已中止。"));
    });
  } finally {
    database.close();
  }
};

export async function saveMasterResumeTemplate(
  file: File,
  sourceText: string,
) {
  const record: ResumeTemplateRecord = {
    id: MASTER_TEMPLATE_ID,
    fileName: file.name,
    sourceText,
    file: file.slice(0, file.size, file.type),
    savedAt: new Date().toISOString(),
  };
  await runStoreRequest("readwrite", (store) => store.put(record));
}

export async function hasMasterResumeTemplate() {
  const record = await runStoreRequest<ResumeTemplateRecord | undefined>(
    "readonly",
    (store) => store.get(MASTER_TEMPLATE_ID),
  );
  return Boolean(record?.file?.size);
}

export async function clearMasterResumeTemplate() {
  await runStoreRequest("readwrite", (store) => store.delete(MASTER_TEMPLATE_ID));
}

const getMasterResumeTemplate = () => runStoreRequest<ResumeTemplateRecord | undefined>(
  "readonly",
  (store) => store.get(MASTER_TEMPLATE_ID),
);

const paragraphTextNodes = (paragraph: Element) => (
  Array.from(paragraph.getElementsByTagNameNS(WORD_NAMESPACE, "t"))
);

const paragraphText = (paragraph: Element) => (
  paragraphTextNodes(paragraph).map((node) => node.textContent ?? "").join("")
);

const replaceTextRange = (
  nodes: Element[],
  start: number,
  length: number,
  replacement: string,
) => {
  let cursor = 0;
  let startIndex = -1;
  let endIndex = -1;
  let startOffset = 0;
  let endOffset = 0;

  nodes.forEach((node, index) => {
    const value = node.textContent ?? "";
    const nextCursor = cursor + value.length;
    if (startIndex < 0 && start >= cursor && start <= nextCursor) {
      startIndex = index;
      startOffset = start - cursor;
    }
    const endPosition = start + length;
    if (endIndex < 0 && endPosition >= cursor && endPosition <= nextCursor) {
      endIndex = index;
      endOffset = endPosition - cursor;
    }
    cursor = nextCursor;
  });

  if (startIndex < 0 || endIndex < 0) {
    throw new Error("有一处修改跨越了无法安全编辑的 Word 结构，请缩小修改范围后重试。");
  }

  const startValue = nodes[startIndex].textContent ?? "";
  const endValue = nodes[endIndex].textContent ?? "";
  if (startIndex === endIndex) {
    nodes[startIndex].textContent = `${startValue.slice(0, startOffset)}${replacement}${startValue.slice(endOffset)}`;
    nodes[startIndex].setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve");
    return;
  }

  nodes[startIndex].textContent = `${startValue.slice(0, startOffset)}${replacement}`;
  nodes[startIndex].setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve");
  for (let index = startIndex + 1; index < endIndex; index += 1) {
    nodes[index].textContent = "";
  }
  nodes[endIndex].textContent = endValue.slice(endOffset);
  nodes[endIndex].setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve");
};

const safeDownloadName = (name: string) => {
  const normalized = name.replace(/[<>:"/\\|?*]+/gu, "-").trim();
  return normalized.toLowerCase().endsWith(".docx") ? normalized : `${normalized}.docx`;
};

export async function exportTailoredResumeWord(
  targetText: string,
  requestedFileName: string,
): Promise<ExportResult> {
  const template = await getMasterResumeTemplate();
  if (!template?.file?.size) {
    throw new Error("尚未保存原始 Word 模板。请先到简历中心重新选择一次原始 .docx 文件。");
  }

  const updates = deriveParagraphUpdates(template.sourceText, targetText);
  const { default: JSZip } = await import("jszip");
  const archive = await JSZip.loadAsync(await template.file.arrayBuffer());
  const documentFile = archive.file("word/document.xml");
  if (!documentFile) throw new Error("这个 Word 文件缺少正文结构，无法作为简历模板导出。");

  const documentXml = await documentFile.async("string");
  const xmlDocument = new DOMParser().parseFromString(documentXml, "application/xml");
  if (xmlDocument.getElementsByTagName("parsererror").length) {
    throw new Error("原始 Word 模板结构无法读取，请换用 Microsoft Word 另存后的 .docx 文件。");
  }

  const wordParagraphs = Array.from(
    xmlDocument.getElementsByTagNameNS(WORD_NAMESPACE, "p"),
  );
  const sourceParagraphs = splitResumeParagraphs(template.sourceText);
  const matchedWordParagraphs: Element[] = [];
  let searchFrom = 0;

  sourceParagraphs.forEach((sourceParagraph) => {
    const comparable = normalizeComparableText(sourceParagraph);
    const matchIndex = wordParagraphs.findIndex((paragraph, index) => (
      index >= searchFrom
      && normalizeComparableText(paragraphText(paragraph)) === comparable
    ));
    if (matchIndex < 0) {
      throw new Error("原始 Word 中有段落无法与当前简历文字对应。请重新导入原文件，且不要在简历中心增删整段内容。");
    }
    matchedWordParagraphs.push(wordParagraphs[matchIndex]);
    searchFrom = matchIndex + 1;
  });

  updates.forEach((update) => {
    const paragraph = matchedWordParagraphs[update.index];
    const nodes = paragraphTextNodes(paragraph);
    const currentText = paragraphText(paragraph);
    const fragmentStart = update.oldFragment
      ? currentText.indexOf(update.oldFragment)
      : currentText === update.sourceParagraph
        ? update.sourceOffset
        : -1;
    if (fragmentStart < 0) {
      throw new Error(`“${update.sourceParagraph.slice(0, 24)}…”中的修改无法安全定位到原 Word，请缩小该段改动后重试。`);
    }
    replaceTextRange(nodes, fragmentStart, update.oldFragment.length, update.newFragment);
  });

  archive.file(
    "word/document.xml",
    new XMLSerializer().serializeToString(xmlDocument),
  );
  const output = await archive.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const fileName = safeDownloadName(requestedFileName);
  const url = URL.createObjectURL(output);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);

  return { fileName, updatedParagraphs: updates.length };
}
