const fs = require('fs').promises;
const chardet = require('chardet');
const { cleanText, detectLanguage } = require('../src/utils/textCleaner');
const { extractChapters } = require('../src/utils/chapterExtractor');

/**
 * Process plain text files (.txt, .md, .rtf)
 * @param {string} filePath - Path to text file
 * @returns {Promise<Object>} Processed document data
 */
async function processText(filePath) {
  try {
    console.log(`Processing text file: ${filePath}`);

    const path = require('path');
    const ext = path.extname(filePath).toLowerCase();

    // Detect file encoding
    const encoding = await detectEncoding(filePath);
    console.log(`Detected encoding: ${encoding}`);

    // Read file with detected encoding
    let rawText = await fs.readFile(filePath, encoding || 'utf-8');

    // Handle RTF files
    if (ext === '.rtf') {
      rawText = stripRTF(rawText);
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
      encoding,
      creationDate: stats.birthtime,
      modificationDate: stats.mtime,
      fileSize: stats.size
    };

    // Extract chapters/sections (especially useful for markdown)
    const chapters = extractChapters(cleanedText, title);

    // Calculate reading statistics
    const lines = cleanedText.split('\n').filter(line => line.trim().length > 0);
    const wordCount = cleanedText.split(/\s+/).filter(word => word.length > 0).length;
    const estimatedReadingTime = Math.ceil(wordCount / 200); // Average 200 words per minute

    return {
      filePath,
      fileType: 'text',
      format: ext.replace('.', ''),
      metadata,
      text: cleanedText,
      rawText,
      language,
      chapters,
      statistics: {
        lines: lines.length,
        wordCount,
        characterCount: cleanedText.length,
        estimatedReadingTime, // in minutes
        paragraphs: cleanedText.split(/\n\n+/).length,
        sentences: cleanedText.split(/[.!?]+/).filter(s => s.trim().length > 0).length
      },
      processedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Text Processing Error:', error);
    throw new Error(`Failed to process text file: ${error.message}`);
  }
}

/**
 * Detect file encoding
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function detectEncoding(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    const detected = chardet.detect(buffer);
    return detected || 'utf-8';
  } catch (error) {
    console.warn('Encoding detection failed, using utf-8:', error.message);
    return 'utf-8';
  }
}

/**
 * Strip RTF formatting codes
 * @param {string} rtfContent
 * @returns {string}
 */
function stripRTF(rtfContent) {
  // Remove RTF control words and symbols
  let text = rtfContent;

  // Remove RTF header
  text = text.replace(/\{\\rtf[^}]*\}/g, '');

  // Remove font table
  text = text.replace(/\{\\fonttbl[^}]*\}/g, '');

  // Remove color table
  text = text.replace(/\{\\colortbl;[^}]*\}/g, '');

  // Remove other RTF control groups
  text = text.replace(/\{\\[^{}]*\}/g, '');

  // Remove RTF control words
  text = text.replace(/\\[a-z]+[0-9-]* ?/gi, '');

  // Remove remaining braces
  text = text.replace(/[{}]/g, '');

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
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
 * Parse markdown structure
 * @param {string} text - Markdown content
 * @returns {Object}
 */
function parseMarkdownStructure(text) {
  const structure = {
    headings: [],
    links: [],
    images: [],
    codeBlocks: []
  };

  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Extract headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      structure.headings.push({
        level: headingMatch[1].length,
        text: headingMatch[2],
        line: i + 1
      });
    }

    // Extract links
    const linkMatches = line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
    for (const match of linkMatches) {
      structure.links.push({
        text: match[1],
        url: match[2],
        line: i + 1
      });
    }

    // Extract images
    const imageMatches = line.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g);
    for (const match of imageMatches) {
      structure.images.push({
        alt: match[1],
        url: match[2],
        line: i + 1
      });
    }

    // Extract code blocks
    if (line.match(/^```/)) {
      const language = line.replace(/^```/, '').trim();
      let codeContent = '';
      let j = i + 1;

      while (j < lines.length && !lines[j].match(/^```/)) {
        codeContent += lines[j] + '\n';
        j++;
      }

      structure.codeBlocks.push({
        language,
        content: codeContent,
        startLine: i + 1,
        endLine: j + 1
      });

      i = j; // Skip to end of code block
    }
  }

  return structure;
}

module.exports = {
  processText,
  parseMarkdownStructure,
  stripRTF
};
