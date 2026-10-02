import { PdfParsingService, MAX_DOCUMENT_BYTES } from './pdf-parsing.service';
import { ReportsService } from '../reports/reports.service';

describe('PdfParsingService', () => {
  let service: PdfParsingService;
  let pdf: any;
  let task: any;
  const item = (str: string, height = 12, y = 100) => ({
    str, height, transform: [height, 0, 0, height, 0, y], hasEOL: true,
  });

  beforeEach(() => {
    service = new PdfParsingService();
    pdf = {
      numPages: 2,
      getMetadata: jest.fn().mockResolvedValue({
        info: { Title: 'Food Manual', Author: 'Chef', CreationDate: 'D:20260101000000Z' },
      }),
      getPage: jest.fn().mockImplementation(async (number) => ({
        getTextContent: async () => ({
          items: number === 1 ? [item('FOOD SAFETY', 18), item('Wash hands'), item('- Clean surfaces')] : [item('Second page')],
        }),
        cleanup: jest.fn(),
      })),
    };
    task = { promise: Promise.resolve(pdf), destroy: jest.fn() };
    (service as any).loadPdfJs = jest.fn().mockResolvedValue({ getDocument: jest.fn(() => task) });
  });

  it('extracts all pages, PDF metadata, headings and lists', async () => {
    const result = await service.parse(Buffer.from('pdf'));
    expect(result.text).toBe('FOOD SAFETY\nWash hands\n- Clean surfaces\n\nSecond page');
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].structure).toEqual([
      { type: 'heading', text: 'FOOD SAFETY' }, { type: 'list', text: '- Clean surfaces' },
    ]);
    expect(result.metadata).toEqual({
      title: 'Food Manual', author: 'Chef', creationDate: 'D:20260101000000Z', pageCount: 2,
    });
    expect(task.destroy).toHaveBeenCalled();
  });

  it('disables PDF JavaScript evaluation', async () => {
    const getDocument = jest.fn(() => task);
    (service as any).loadPdfJs.mockResolvedValue({ getDocument });
    await service.parse(Buffer.from('pdf'));
    expect(getDocument).toHaveBeenCalledWith(expect.objectContaining({ isEvalSupported: false }));
  });

  it('handles scanned pages with no text and missing metadata', async () => {
    pdf.numPages = 1;
    pdf.getMetadata.mockResolvedValue({ info: {} });
    pdf.getPage.mockResolvedValue({ getTextContent: async () => ({ items: [] }), cleanup: jest.fn() });
    const result = await service.parse(Buffer.from('pdf'));
    expect(result.text).toBe('');
    expect(result.pages[0].structure).toEqual([]);
    expect(result.metadata).toEqual({ title: null, author: null, creationDate: null, pageCount: 1 });
  });

  it('cleans up when parsing a corrupt or password-protected PDF fails', async () => {
    task.promise = Promise.reject(new Error('Invalid PDF'));
    await expect(service.parse(Buffer.from('corrupt'))).rejects.toThrow('Invalid PDF');
    expect(task.destroy).toHaveBeenCalled();
  });

  it('bounds file size and page count', async () => {
    await expect(service.parse({ length: MAX_DOCUMENT_BYTES + 1 } as Buffer)).rejects.toThrow('20 MB');
    expect((service as any).loadPdfJs).not.toHaveBeenCalled();
    pdf.numPages = 1001;
    await expect(service.parse(Buffer.from('pdf'))).rejects.toThrow('1000 page');
    expect(task.destroy).toHaveBeenCalled();
  });

  it('reads a real PDF produced by the application using PDF.js', async () => {
    const report = new ReportsService(null, null);
    const buffer = (report as any).buildPdf(['FOOD SAFETY', 'Wash hands', '- Clean surfaces']);
    const result = await new PdfParsingService().parse(buffer);
    expect(result.text).toContain('Wash hands');
    expect(result.metadata.pageCount).toBe(1);
    expect(result.pages[0].structure).toEqual([
      { type: 'heading', text: 'FOOD SAFETY' }, { type: 'list', text: '- Clean surfaces' },
    ]);
  });

  it('rejects a real corrupt file using PDF.js', async () => {
    await expect(new PdfParsingService().parse(Buffer.from('not a PDF'))).rejects.toThrow();
  });
});
