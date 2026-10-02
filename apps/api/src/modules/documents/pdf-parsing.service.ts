import { Injectable } from '@nestjs/common';
import { dirname, join } from 'path';

export interface PdfPage {
  pageNumber: number;
  text: string;
  structure: { type: 'heading' | 'list'; text: string }[];
}

export interface PdfMetadata {
  title: string | null;
  author: string | null;
  creationDate: string | null;
  pageCount: number;
}

export interface PdfExtraction {
  text: string;
  pages: PdfPage[];
  metadata: PdfMetadata;
}

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

@Injectable()
export class PdfParsingService {
  // Preserve native ESM import in this CommonJS API; PDF.js ships only ESM.
  private readonly loadPdfJs = new Function('return import("pdfjs-dist/legacy/build/pdf.mjs")') as
    () => Promise<typeof import('pdfjs-dist')>;

  async parse(buffer: Buffer): Promise<PdfExtraction> {
    if (buffer.length > MAX_DOCUMENT_BYTES) {
      throw new Error('PDF exceeds the 20 MB limit');
    }
    const { getDocument } = await this.loadPdfJs();
    const task = getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: false,
      isOffscreenCanvasSupported: false,
      stopAtErrors: true,
      standardFontDataUrl: join(dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts/'),
      cMapUrl: join(dirname(require.resolve('pdfjs-dist/package.json')), 'cmaps/'),
      cMapPacked: true,
    });
    try {
      const pdf = await task.promise;
      if (pdf.numPages > 1000) {
        throw new Error('PDF exceeds the 1000 page limit');
      }
      const { info } = await pdf.getMetadata();
      const properties = info as Record<string, unknown>;
      const pages: PdfPage[] = [];
      let textLength = 0;
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        try {
          const content = await page.getTextContent();
          const lines: { text: string; height: number }[] = [];
          let line = '';
          let height = 0;
          let previousY: number | undefined;
          const flush = () => {
            if (line.trim()) lines.push({ text: line.trim(), height });
            line = '';
            height = 0;
          };
          for (const item of content.items) {
            if (!('str' in item)) continue;
            const y = item.transform[5];
            if (previousY !== undefined && Math.abs(y - previousY) > 2) flush();
            line += `${line && !line.endsWith(' ') ? ' ' : ''}${item.str}`;
            height = Math.max(height, Math.abs(item.height));
            previousY = y;
            if (item.hasEOL) flush();
          }
          flush();
          const text = lines.map((value) => value.text).join('\n');
          textLength += text.length;
          if (textLength > 5_000_000) throw new Error('PDF extracted text is too large');
          const heights = lines.map((value) => value.height).sort((a, b) => a - b);
          const bodyHeight = heights[Math.floor(heights.length / 2)] || 0;
          const structure: PdfPage['structure'] = [];
          for (const value of lines) {
            if (/^(?:[-*•▪]|\d+[.)])\s+/.test(value.text)) {
              structure.push({ type: 'list', text: value.text });
            } else if (value.text.length <= 200 &&
              ((bodyHeight > 0 && value.height > bodyHeight * 1.2) ||
                (/^[A-Z][A-Z\s\d:,-]+$/.test(value.text) && /[A-Z]{2}/.test(value.text)))) {
              structure.push({ type: 'heading', text: value.text });
            }
          }
          pages.push({ pageNumber, text, structure });
        } finally {
          page.cleanup();
        }
      }
      return {
        text: pages.map((page) => page.text).join('\n\n'),
        pages,
        metadata: {
          title: typeof properties.Title === 'string' ? properties.Title : null,
          author: typeof properties.Author === 'string' ? properties.Author : null,
          creationDate: typeof properties.CreationDate === 'string' ? properties.CreationDate : null,
          pageCount: pdf.numPages,
        },
      };
    } finally {
      await task.destroy();
    }
  }
}
