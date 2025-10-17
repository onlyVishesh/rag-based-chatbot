import fs from "fs";
import { query } from "../db/client";
import { generateEmbedding } from "../services/ollama";
import { cleanText, processAllPDFs } from "../services/pdf";

/**
 * Store content chunks with embeddings in the database
 */
async function storeContentWithEmbeddings(
  chunks: string[],
  topic: string,
  filename: string,
  type: "explanation" | "question" | "misconception" = "explanation",
  difficulty: "easy" | "medium" | "hard" = "medium"
) {
  console.log(`Storing ${chunks.length} chunks for ${filename}...`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = cleanText(chunks[i]);

    if (chunk.length < 50) continue; // Skip very short chunks

    try {
      console.log(`Processing chunk ${i + 1}/${chunks.length}...`);

      // Generate embedding for the chunk
      const embedding = await generateEmbedding(chunk);

      // Store in database
      await query(
        `INSERT INTO content_items (topic, type, difficulty, content, embedding)
         VALUES ($1, $2, $3, $4, $5)`,
        [topic, type, difficulty, chunk, JSON.stringify(embedding)]
      );

      console.log(`✓ Stored chunk ${i + 1}/${chunks.length}`);

      // Add small delay to avoid overwhelming Ollama
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error processing chunk ${i + 1}:`, error);
      // Continue with next chunk
    }
  }
}

/**
 * Process a directory of PDFs and store in vector database
 */
export async function processPDFDirectory(
  pdfDirectory: string,
  topic: string = "General"
) {
  try {
    console.log(`\n🚀 Starting PDF processing for directory: ${pdfDirectory}`);
    console.log(`Topic: ${topic}\n`);

    // Check if directory exists
    if (!fs.existsSync(pdfDirectory)) {
      console.error(`Directory does not exist: ${pdfDirectory}`);
      return;
    }

    // Process all PDFs in the directory
    const pdfDocuments = await processAllPDFs(pdfDirectory, topic);

    if (pdfDocuments.length === 0) {
      console.log("No PDF files found to process.");
      return;
    }

    console.log(`\n📚 Processing ${pdfDocuments.length} PDF documents...\n`);

    // Store each document's chunks in the database
    for (const doc of pdfDocuments) {
      console.log(`\n📖 Processing: ${doc.filename}`);

      await storeContentWithEmbeddings(
        doc.chunks,
        topic,
        doc.filename,
        "explanation",
        "medium"
      );

      console.log(`✅ Completed: ${doc.filename}`);
    }

    console.log(`\n🎉 All PDFs processed successfully!`);

    // Show summary
    const result = await query(
      "SELECT COUNT(*) as count FROM content_items WHERE topic = $1",
      [topic]
    );

    console.log(`\n📊 Summary:`);
    console.log(`- Total documents processed: ${pdfDocuments.length}`);
    console.log(`- Total content items stored: ${result.rows[0].count}`);
    console.log(`- Topic: ${topic}`);
  } catch (error) {
    console.error("Error processing PDF directory:", error);
    throw error;
  }
}

/**
 * Main function to run the embedding process
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log("\nUsage: npm run process-pdfs <pdf-directory> [topic]");
    console.log("\nExample:");
    console.log('npm run process-pdfs ./pdfs/math "Mathematics"');
    console.log('npm run process-pdfs ./pdfs/chemistry "Chemistry"\n');
    process.exit(1);
  }

  const pdfDirectory = args[0];
  const topic = args[1] || "General";

  try {
    await processPDFDirectory(pdfDirectory, topic);
    console.log("\n✨ Process completed successfully!");
  } catch (error) {
    console.error("\n❌ Process failed:", error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}
