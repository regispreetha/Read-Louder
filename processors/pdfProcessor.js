const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const { cleanText, detectLanguage } = require('../src/utils/textCleaner');
const { extractChapters } = require('../src/utils/chapterExtractor');

/**
 * Process PDF document and extract text content
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<Object>} Processed document data
 */
async function processPDF(filePath) {
  try {
    console.log(`Processing PDF: ${filePath}`);

    // Read PDF file
    const dataBuffer = await fs.readFile(filePath);

    // Parse PDF
    const data = await pdfParse(dataBuffer, {
      // Options for better text extraction
      max: 0, // Extract all pages
      version: 'default'
    });

    // Extract metadata
    const metadata = {
      title: data.info?.Title || extractTitleFromPath(filePath),
      author: data.info?.Author || 'Unknown',
      subject: data.info?.Subject || '',
      creator: data.info?.Creator || '',
      producer: data.info?.Producer || '',
      creationDate: data.info?.CreationDate || null,
      modificationDate: data.info?.ModDate || null,
      pages: data.numpages
    };

    // Clean and process text
    const rawText = data.text;
    const cleanedText = cleanText(rawText);

    // Detect language
    const language = detectLanguage(cleanedText);

    // Extract chapters/sections
    const chapters = extractChapters(cleanedText, metadata.title);

    // Calculate reading statistics
    const wordCount = cleanedText.split(/\s+/).filter(word => word.length > 0).length;
    const estimatedReadingTime = Math.ceil(wordCount / 200); // Average 200 words per minute

    return {
      filePath,
      fileType: 'pdf',
      metadata,
      text: cleanedText,
      rawText,
      language,
      chapters,
      statistics: {
        pages: data.numpages,
        wordCount,
        characterCount: cleanedText.length,
        estimatedReadingTime, // in minutes
        paragraphs: cleanedText.split(/\n\n+/).length
      },
      processedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('PDF Processing Error:', error);
    throw new Error(`Failed to process PDF: ${error.message}`);
  }
}

/**
 * Extract title from file path
 * @param {string} filePath
 * @returns {string}
 */
function extractTitleFromPath(filePath) {
  const path = require('path');
  const fileName = path.basename(filePath, path.extname(filePath));
  return fileName
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Process password-protected PDF
 * @param {string} filePath
 * @param {string} password
 * @returns {Promise<Object>}
 */
async function processProtectedPDF(filePath, password) {
  try {
    const dataBuffer = await fs.readFile(filePath);

    const data = await pdfParse(dataBuffer, {
      password: password
    });

    return processPDF(filePath);
  } catch (error) {
    if (error.message.includes('password')) {
      throw new Error('Invalid password or password-protected PDF');
    }
    throw error;
  }
}

module.exports = {
  processPDF,
  processProtectedPDF
};
