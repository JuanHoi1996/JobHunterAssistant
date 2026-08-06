/**
 * Client-side resume text extraction for the UX spike bed.
 * Docx uses mammoth (same as resume center). PDF uses pdf.js text layer.
 */

export async function extractResumeTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value.trim();
  }
  if (name.endsWith(".pdf")) {
    return extractPdfText(await file.arrayBuffer());
  }
  throw new Error("仅支持 .docx 或 .pdf 简历文件。");
}

async function extractPdfText(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerSrc = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc.default;

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const document = await loadingTask.promise;

  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => ("str" in item ? String(item.str) : ""))
      .join(" ")
      .replace(/\s+/gu, " ")
      .trim();
    if (line) pages.push(line);
  }
  return pages.join("\n\n").trim();
}
