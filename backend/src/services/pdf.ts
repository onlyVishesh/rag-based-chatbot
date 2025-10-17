import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import { PDFDocument } from "../types";

/**
 * Extract text content from a PDF file
 */
export async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error(`Error extracting text from PDF ${filePath}:`, error);
    throw new Error(`Failed to extract text from PDF: ${error}`);
  }
}

/**
 * Split text into chunks for better embedding and retrieval
 */
export function chunkText(
  text: string,
  maxChunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  let currentChunk = "";
  let currentSize = 0;

  for (const sentence of sentences) {
    const sentenceSize = sentence.trim().length;

    // If adding this sentence would exceed the chunk size
    if (currentSize + sentenceSize > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());

      // Start new chunk with overlap from previous chunk
      const words = currentChunk.split(" ");
      const overlapWords = words.slice(-Math.floor(overlap / 10)); // Approximate overlap
      currentChunk = overlapWords.join(" ") + " " + sentence.trim();
      currentSize = currentChunk.length;
    } else {
      currentChunk += " " + sentence.trim();
      currentSize = currentChunk.length;
    }
  }

  // Add the last chunk if it has content
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((chunk) => chunk.length > 50); // Filter out very small chunks
}

/**
 * Process a single PDF file and return structured data
 */
export async function processPDF(
  filePath: string,
  topic?: string
): Promise<PDFDocument> {
  try {
    const filename = path.basename(filePath);
    console.log(`Processing PDF: ${filename}`);

    // Extract raw text
    const content = await extractTextFromPDF(filePath);

    // Create chunks
    const chunks = chunkText(content);

    // Get file stats for metadata
    const stats = fs.statSync(filePath);

    const pdfDoc: PDFDocument = {
      filename,
      content,
      chunks,
      metadata: {
        title: filename.replace(".pdf", ""),
        pages: 0, // We'll estimate this from content length
        topic: topic || "General",
      },
    };

    console.log(`Processed ${filename}: ${chunks.length} chunks created`);
    return pdfDoc;
  } catch (error) {
    console.error(`Error processing PDF ${filePath}:`, error);
    throw error;
  }
}

/**
 * Process all PDFs in a directory
 */
export async function processAllPDFs(
  directoryPath: string,
  topic?: string
): Promise<PDFDocument[]> {
  try {
    const files = fs.readdirSync(directoryPath);
    const pdfFiles = files.filter((file) =>
      file.toLowerCase().endsWith(".pdf")
    );

    console.log(`Found ${pdfFiles.length} PDF files in ${directoryPath}`);

    const processedDocs: PDFDocument[] = [];

    for (const pdfFile of pdfFiles) {
      const filePath = path.join(directoryPath, pdfFile);
      try {
        const doc = await processPDF(filePath, topic);
        processedDocs.push(doc);
      } catch (error) {
        console.error(`Failed to process ${pdfFile}:`, error);
        // Continue with other files
      }
    }

    return processedDocs;
  } catch (error) {
    console.error(
      `Error processing PDFs in directory ${directoryPath}:`,
      error
    );
    throw error;
  }
}

/**
 * Clean and normalize text for better embedding quality
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/\n+/g, " ") // Replace newlines with spaces
    .replace(/[^\x20-\x7E]/g, "") // Remove non-printable characters
    .trim();
}
