const fs = require('fs').promises;
const mammoth = require('mammoth');
const { cleanText, detectLanguage } = require('../src/utils/textCleaner');
const { extractChapters } = require('../src/utils/chapterExtractor');

/**
 * Process Word document (.docx, .doc) and extract text content
 * @param {string} filePath - Path to Word file
 * @returns {Promise<Object>} Processed document data
 */
async function processWord(filePath) {
  try {
    console.log(`Processing Word document: ${filePath}`);

    const path = require('path');
    const ext = path.extname(filePath).toLowerCase();

    let rawText;
    let htmlContent = '';

    if (ext === '.docx') {
      // Process .docx files
      const result = await mammoth.extractRawText({ path: filePath });
      rawText = result.value;

      // Also extract with styling for better structure detection
      const htmlResult = await mammoth.convertToHtml({ path: filePath });
      htmlContent = htmlResult.value;
    } else if (ext === '.doc') {
      // Process legacy .doc files using textract
      const textract = require('textract');
      rawText = await new Promise((resolve, reject) => {
        textract.fromFileWithPath(filePath, (error, text) => {
          if (error) reject(error);
          else resolve(text);
        });
      });
    } else {
      throw new Error(`Unsupported Word format: ${ext}`);
    }

    // Clean and process text
    const cleanedText = cleanText(rawText);

    // Detect language
    const language = detectLanguage(cleanedText);

    // Extract metadata from file
    const stats = await fs.stat(filePath);
    const fileName = path.basename(filePath, ext);
    const title = extractTitleFromPath(filePath);

    const metadata = {
      title,
      fileName,
      author: 'Unknown',
      creationDate: stats.birthtime,
      modificationDate: stats.mtime,
      fileSize: stats.size
    };

    // Extract chapters/sections
    const chapters = extractChapters(cleanedText, title);

    // Calculate reading statistics
    const wordCount = cleanedText.split(/\s+/).filter(word => word.length > 0).length;
    const estimatedReadingTime = Math.ceil(wordCount / 200); // Average 200 words per minute

    return {
      filePath,
      fileType: 'word',
      format: ext.replace('.', ''),
      metadata,
      text: cleanedText,
      rawText,
      htmlContent,
      language,
      chapters,
      statistics: {
        wordCount,
        characterCount: cleanedText.length,
        estimatedReadingTime, // in minutes
        paragraphs: cleanedText.split(/\n\n+/).length,
        sentences: cleanedText.split(/[.!?]+/).filter(s => s.trim().length > 0).length
      },
      processedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Word Processing Error:', error);
    throw new Error(`Failed to process Word document: ${error.message}`);
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
 * Extract structured content from Word document
 * @param {string} filePath
 * @returns {Promise<Object>}
 */
async function processWordWithStructure(filePath) {
  try {
    const result = await mammoth.convertToHtml({ path: filePath });
    const html = result.value;
    const messages = result.messages;

    // Parse HTML to extract structure
    const structure = parseHtmlStructure(html);

    return {
      html,
      structure,
      warnings: messages
    };
  } catch (error) {
    throw new Error(`Failed to extract Word structure: ${error.message}`);
  }
}

/**
 * Parse HTML structure from mammoth conversion
 * @param {string} html
 * @returns {Object}
 */
function parseHtmlStructure(html) {
  const structure = {
    headings: [],
    lists: [],
    tables: [],
    images: []
  };

  // Extract headings
  const headingRegex = /<h([1-6])>(.*?)<\/h\1>/g;
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    structure.headings.push({
      level: parseInt(match[1]),
      text: match[2].replace(/<[^>]*>/g, '')
    });
  }

  // Extract lists
  const listRegex = /<(ul|ol)>(.*?)<\/\1>/gs;
  while ((match = listRegex.exec(html)) !== null) {
    structure.lists.push({
      type: match[1],
      content: match[2]
    });
  }

  // Extract tables
  const tableRegex = /<table>(.*?)<\/table>/gs;
  while ((match = tableRegex.exec(html)) !== null) {
    structure.tables.push(match[1]);
  }

  return structure;
}

module.exports = {
  processWord,
  processWordWithStructure
};
