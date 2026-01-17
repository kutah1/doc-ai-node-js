import pdf from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Extracts text content from various document types.
 * @param {Buffer} fileBuffer The buffer of the uploaded file.
 * @param {string} mimeType The MIME type of the uploaded file (e.g., 'application/pdf').
 * @returns {Promise<string>} A promise that resolves to the extracted text content.
 * @throws {Error} If the file type is unsupported or if there's an error during processing.
 */
export async function extractTextFromFile(fileBuffer, mimeType) {
  try {
    switch (mimeType) {
      case 'application/pdf':
        const pdfData = await pdf(fileBuffer);
        return pdfData.text;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': // .docx
        const docxData = await mammoth.extractRawText({ buffer: fileBuffer });
        return docxData.value;
      case 'text/plain': // .txt
        return fileBuffer.toString('utf8');
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error(`Error extracting text from file (${mimeType}):`, error.message);
    throw new Error(`Failed to process file: ${error.message}`);
  }
}
