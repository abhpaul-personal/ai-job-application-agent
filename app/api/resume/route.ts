import mammoth from "mammoth";
import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

// Resumes are never legitimately larger than this — a generous ceiling that
// mainly guards against someone uploading the wrong file entirely.
const MAX_FILE_BYTES = 8 * 1024 * 1024;

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isDocx(file: File): boolean {
  return file.type === DOCX_MIME || file.name.toLowerCase().endsWith(".docx");
}

// No LLM call here — purely mechanical text extraction, kept separate from
// the "profileExtract" stage on /api/agent because that route only accepts
// JSON, not file uploads. The client chains this endpoint's output into
// that stage as rawInput.
export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Request must be a multipart/form-data upload." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "That file is larger than 8MB — too large for a resume." },
      { status: 400 },
    );
  }

  try {
    const buffer = new Uint8Array(await file.arrayBuffer());

    if (isPdf(file)) {
      const pdf = await getDocumentProxy(buffer);
      const { text } = await extractText(pdf, { mergePages: true });
      return NextResponse.json({ data: { text } }, { status: 200 });
    }

    if (isDocx(file)) {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
      return NextResponse.json({ data: { text: result.value } }, { status: 200 });
    }

    return NextResponse.json(
      { error: "Only PDF and DOCX resumes are supported." },
      { status: 400 },
    );
  } catch (err) {
    console.error("Failed to extract resume text:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Could not read that file — it may be corrupted or password-protected." },
      { status: 422 },
    );
  }
}
