import { Document, HeadingLevel, Packer, Paragraph } from "docx";
import { jsPDF } from "jspdf";

const PDF_MARGIN = 15;
const PDF_LINE_HEIGHT = 7;
const PDF_TITLE_SIZE = 16;
const PDF_BODY_SIZE = 11;

// Plain title + body-line builders, not tied to ApplicationKit's shape, so
// the same two functions serve CV (headline + bullets) and cover letter
// (paragraph-split body) alike. Clean and simple by design — this is a
// correct-content-in-a-usable-file feature, not a template/theme system.
export function buildPdfBytes(title: string, bodyParagraphs: string[]): Uint8Array {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - PDF_MARGIN * 2;
  let y = PDF_MARGIN;

  doc.setFontSize(PDF_TITLE_SIZE);
  doc.setFont("helvetica", "bold");
  for (const line of doc.splitTextToSize(title, maxWidth) as string[]) {
    doc.text(line, PDF_MARGIN, y);
    y += PDF_LINE_HEIGHT + 2;
  }
  y += 4;

  doc.setFontSize(PDF_BODY_SIZE);
  doc.setFont("helvetica", "normal");
  for (const paragraph of bodyParagraphs) {
    const wrapped = doc.splitTextToSize(paragraph, maxWidth) as string[];
    for (const line of wrapped) {
      if (y > pageHeight - PDF_MARGIN) {
        doc.addPage();
        y = PDF_MARGIN;
      }
      doc.text(line, PDF_MARGIN, y);
      y += PDF_LINE_HEIGHT;
    }
    y += PDF_LINE_HEIGHT / 2;
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

export async function buildDocxBytes(
  title: string,
  bodyParagraphs: string[],
): Promise<Uint8Array> {
  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
          ...bodyParagraphs.map((text) => new Paragraph({ text })),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(document);
  return new Uint8Array(buffer);
}
