# PDF Processing Instructions

## How to add your educational content

1. **Place your PDF files** in the `sample-pdfs` directory (or create your own directory)

2. **Run the processing script** to extract text and generate embeddings:

   ```bash
   npm run process-pdfs ./sample-pdfs "Mathematics"
   ```

3. **The script will**:
   - Extract text from all PDF files in the directory
   - Split content into chunks for better retrieval
   - Generate embeddings using Ollama
   - Store everything in the PostgreSQL vector database

## Example usage

```bash
# Process math textbooks
npm run process-pdfs ./pdfs/math "Quadratic Equations"

# Process chemistry books
npm run process-pdfs ./pdfs/chemistry "Chemical Reactions"

# Process general educational content
npm run process-pdfs ./pdfs/general "General"
```

## Prerequisites

1. **Ollama running** with embedding model:

   ```bash
   ollama pull nomic-embed-text
   ```

2. **PostgreSQL** with pgvector extension enabled

3. **PDF files** in the specified directory

## Notes

- The script processes PDFs sequentially to avoid overwhelming the system
- Each chunk is stored with topic, type, difficulty, and vector embedding
- You can process multiple topics by running the script multiple times with different directories
- Large PDFs will be split into smaller chunks for better retrieval accuracy
