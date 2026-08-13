/// <reference types="vite/client" />

declare module "pdfjs-dist/build/pdf.worker.min.mjs?url" {
  const workerSrc: string;
  export default workerSrc;
}

declare module "*.md?raw" {
  const content: string;
  export default content;
}
