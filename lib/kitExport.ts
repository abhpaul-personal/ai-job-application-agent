import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { jsPDF } from "jspdf";
import type { Cv } from "./schema";

const PDF_MARGIN = 15;
const PDF_LINE_HEIGHT = 7;
const PDF_TITLE_SIZE = 16;
const PDF_BODY_SIZE = 11;

// A letter's raw text has two kinds of line break: a single "\n" within a
// block that should stay visually tight (the sender's name/location/email,
// a signature's "Warm regards," + name), and a blank line ("\n\n" or more)
// marking a genuine new paragraph that deserves a bigger gap. Splitting on
// every single "\n" (as a naive .split("\n") does) loses that distinction —
// every line, including the blank separators themselves, ends up treated as
// its own paragraph and gets the same oversized gap, which is what produced
// the inconsistent spacing this function's callers were fixing. Splitting
// only on blank-line boundaries keeps multi-line blocks intact; each
// resulting block may still contain internal "\n"s, which the PDF/DOCX
// builders below render as plain line breaks with no extra gap.
export function splitIntoParagraphBlocks(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

// Plain title + body-line builders — used for the cover letter (a single
// flowing document), not tied to ApplicationKit's shape. The CV gets its
// own structure-aware builders below, since a CV needs a header block,
// section headings, and dated entries, not just wrapped paragraphs.
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
    // A full line's worth of gap between paragraphs (was half a line) —
    // the previous spacing read as a wall of text with no visible breaks.
    y += PDF_LINE_HEIGHT;
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

// A "paragraph" here may itself contain embedded "\n" line breaks (e.g. a
// sender's name/location/email block, kept together as one paragraph by the
// caller precisely so it does NOT get a between-paragraph gap between each
// line). docx's Paragraph renders `text` as one literal run with no special
// handling of "\n", so each internal line becomes its own TextRun joined by
// an explicit `break`, all inside the same Paragraph — only the paragraph
// itself carries the `after` spacing, once, regardless of how many lines it
// contains.
function paragraphFromBlock(block: string, spacingAfter: number): Paragraph {
  const lines = block.split("\n");
  const children = lines.flatMap((line, i) =>
    i === 0 ? [new TextRun(line)] : [new TextRun({ text: line, break: 1 })],
  );
  return new Paragraph({ children, spacing: { after: spacingAfter } });
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
          ...bodyParagraphs.map((block) => paragraphFromBlock(block, 200)),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(document);
  return new Uint8Array(buffer);
}

const CV_MARGIN = 15;
const CV_LINE_HEIGHT = 5.5;
const CV_NAME_SIZE = 18;
const CV_TITLE_SIZE = 11;
const CV_SECTION_SIZE = 11;
const CV_BODY_SIZE = 10;

// Genuinely CV-shaped, not a template/theme system: centered header block,
// a rule under it, then bold-caps section headings (each with a thin rule)
// for Summary / Core Competencies / Experience / Education / Certifications
// / Skills. Experience entries bold the role+company, italicize the dates,
// and indent bullets underneath — the visual hierarchy a bullet dump has
// none of. Every section is omitted entirely when the profile has nothing
// for it, rather than rendering an empty heading.
export function buildCvPdfBytes(cv: Cv): Uint8Array {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - CV_MARGIN * 2;
  const centerX = pageWidth / 2;
  let y = CV_MARGIN;

  function ensureSpace(lines = 1) {
    if (y + lines * CV_LINE_HEIGHT > pageHeight - CV_MARGIN) {
      doc.addPage();
      y = CV_MARGIN;
    }
  }

  function sectionHeading(title: string) {
    ensureSpace(3);
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(CV_SECTION_SIZE);
    doc.text(title.toUpperCase(), CV_MARGIN, y);
    y += 1.5;
    doc.setDrawColor(190);
    doc.line(CV_MARGIN, y, pageWidth - CV_MARGIN, y);
    y += CV_LINE_HEIGHT;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(CV_BODY_SIZE);
  }

  function bodyParagraph(text: string) {
    for (const line of doc.splitTextToSize(text, maxWidth) as string[]) {
      ensureSpace();
      doc.text(line, CV_MARGIN, y);
      y += CV_LINE_HEIGHT;
    }
  }

  function bulletList(items: string[]) {
    for (const item of items) {
      const wrapped = doc.splitTextToSize(item, maxWidth - 5) as string[];
      wrapped.forEach((line, i) => {
        ensureSpace();
        doc.text(i === 0 ? `• ${line}` : `  ${line}`, CV_MARGIN, y);
        y += CV_LINE_HEIGHT;
      });
    }
  }

  // Header — centered name/title/contact, then a rule.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(CV_NAME_SIZE);
  doc.text(cv.header.name, centerX, y, { align: "center" });
  y += CV_LINE_HEIGHT + 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(CV_TITLE_SIZE);
  for (const line of doc.splitTextToSize(cv.header.title, maxWidth) as string[]) {
    doc.text(line, centerX, y, { align: "center" });
    y += CV_LINE_HEIGHT;
  }

  if (cv.header.contactLine) {
    doc.setFontSize(CV_BODY_SIZE);
    doc.setTextColor(100);
    for (const line of doc.splitTextToSize(cv.header.contactLine, maxWidth) as string[]) {
      doc.text(line, centerX, y, { align: "center" });
      y += CV_LINE_HEIGHT;
    }
    doc.setTextColor(0);
  }

  y += 2;
  doc.setDrawColor(120);
  doc.line(CV_MARGIN, y, pageWidth - CV_MARGIN, y);
  y += CV_LINE_HEIGHT;
  doc.setFontSize(CV_BODY_SIZE);

  if (cv.summary) {
    sectionHeading("Professional Summary");
    bodyParagraph(cv.summary);
  }

  if (cv.coreCompetencies.length > 0) {
    sectionHeading("Core Competencies");
    bodyParagraph(cv.coreCompetencies.join("  |  "));
  }

  if (cv.experience.length > 0) {
    sectionHeading("Professional Experience");
    for (const entry of cv.experience) {
      ensureSpace(2);
      doc.setFont("helvetica", "bold");
      doc.text(`${entry.role} — ${entry.company}`, CV_MARGIN, y);
      y += CV_LINE_HEIGHT;
      doc.setFont("helvetica", "italic");
      doc.text(entry.dates, CV_MARGIN, y);
      y += CV_LINE_HEIGHT;
      doc.setFont("helvetica", "normal");
      bulletList(entry.bullets);
      y += 2;
    }
  }

  if (cv.education.length > 0) {
    sectionHeading("Education");
    bulletList(cv.education);
  }

  if (cv.certifications.length > 0) {
    sectionHeading("Certifications");
    bulletList(cv.certifications);
  }

  if (cv.skills.length > 0) {
    sectionHeading("Technical Skills");
    bulletList(cv.skills);
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

export async function buildCvDocxBytes(cv: Cv): Promise<Uint8Array> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: cv.header.name, bold: true, size: 32 })],
      alignment: AlignmentType.CENTER,
    }),
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: cv.header.title, size: 22 })],
      alignment: AlignmentType.CENTER,
    }),
  );
  if (cv.header.contactLine) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: cv.header.contactLine, size: 18, color: "666666" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
    );
  }

  function sectionHeading(title: string) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 22 })],
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 2 },
        },
        spacing: { before: 240, after: 120 },
      }),
    );
  }

  function bulletParagraphs(items: string[]): Paragraph[] {
    return items.map((item) => new Paragraph({ text: item, bullet: { level: 0 } }));
  }

  if (cv.summary) {
    sectionHeading("Professional Summary");
    children.push(new Paragraph({ text: cv.summary, spacing: { after: 150 } }));
  }

  if (cv.coreCompetencies.length > 0) {
    sectionHeading("Core Competencies");
    children.push(
      new Paragraph({ text: cv.coreCompetencies.join("  |  "), spacing: { after: 150 } }),
    );
  }

  if (cv.experience.length > 0) {
    sectionHeading("Professional Experience");
    for (const entry of cv.experience) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${entry.role} — ${entry.company}`, bold: true })],
        }),
      );
      children.push(
        new Paragraph({
          children: [new TextRun({ text: entry.dates, italics: true, size: 20 })],
          spacing: { after: 80 },
        }),
      );
      children.push(...bulletParagraphs(entry.bullets));
      children.push(new Paragraph({ text: "", spacing: { after: 100 } }));
    }
  }

  if (cv.education.length > 0) {
    sectionHeading("Education");
    children.push(...bulletParagraphs(cv.education));
  }

  if (cv.certifications.length > 0) {
    sectionHeading("Certifications");
    children.push(...bulletParagraphs(cv.certifications));
  }

  if (cv.skills.length > 0) {
    sectionHeading("Technical Skills");
    children.push(...bulletParagraphs(cv.skills));
  }

  const document = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(document);
  return new Uint8Array(buffer);
}
