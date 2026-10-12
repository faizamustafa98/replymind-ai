"""Extract plain text from uploaded document bytes (txt/csv/pdf/docx)."""

import csv
import io

import docx
from pypdf import PdfReader


def extract_text(content: bytes, file_type: str) -> str:
    """Extract plain text from an uploaded document's raw bytes.

    file_type is the extension recorded on the documents row (txt/pdf/docx/csv),
    already validated against ALLOWED_DOCUMENT_TYPES at upload time.
    """
    if file_type == "txt":
        return content.decode("utf-8", errors="ignore")

    if file_type == "csv":
        text = content.decode("utf-8", errors="ignore")
        rows = csv.reader(io.StringIO(text))
        return "\n".join(", ".join(row) for row in rows)

    if file_type == "pdf":
        reader = PdfReader(io.BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    if file_type == "docx":
        document = docx.Document(io.BytesIO(content))
        return "\n".join(paragraph.text for paragraph in document.paragraphs)

    raise ValueError(f"No text extractor available for file type '{file_type}'")
