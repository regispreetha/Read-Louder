const natural = require('natural');
const franc = require('franc');

/**
 * Clean and normalize text for better TTS output
 * @param {string} text - Raw text to clean
 * @returns {string} Cleaned text
 */
function cleanText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let cleaned = text;

  // Remove excessive whitespace
  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  // Normalize line breaks (max 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Remove page numbers and headers/footers patterns
  cleaned = cleaned.replace(/^\s*\d+\s*$/gm, '');
  cleaned = cleaned.replace(/^[-_=]{3,}$/gm, '');

  // Fix common OCR errors
  cleaned = fixOCRErrors(cleaned);

  // Normalize punctuation spacing
  cleaned = cleaned.replace(/\s+([.,!?;:])/g, '$1');
  cleaned = cleaned.replace(/([.,!?;:])\s*/g, '$1 ');

  // Handle abbreviations for better pronunciation
  cleaned = expandAbbreviations(cleaned);

  // Normalize quotes
  cleaned = cleaned.replace(/[""]/g, '"');
  cleaned = cleaned.replace(/['']/g, "'");

  // Remove URLs (or replace with "link" for context)
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, ' [link] ');

  // Clean email addresses
  cleaned = cleaned.replace(/[\w.-]+@[\w.-]+\.\w+/g, ' [email address] ');

  // Remove excessive punctuation
  cleaned = cleaned.replace(/([!?.]){2,}/g, '$1');

  // Trim lines and remove empty lines at start/end
  cleaned = cleaned
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();

  return cleaned;
}

/**
 * Fix common OCR errors
 * @param {string} text
 * @returns {string}
 */
function fixOCRErrors(text) {
  const corrections = {
    // Common OCR character confusions
    'rn': 'm', // in specific contexts
    'vv': 'w',
    '0': 'O', // in words (contextual)
    '1': 'l', // in words (contextual)
    // Common word errors
    'tlie': 'the',
    'tbe': 'the',
    'aud': 'and',
    'aad': 'and',
    'thls': 'this',
    'whlch': 'which',
    'frotn': 'from',
    'witli': 'with'
  };

  let corrected = text;

  // Apply word-level corrections
  for (const [error, correction] of Object.entries(corrections)) {
    const regex = new RegExp(`\\b${error}\\b`, 'gi');
    corrected = corrected.replace(regex, correction);
  }

  return corrected;
}

/**
 * Expand common abbreviations for better pronunciation
 * @param {string} text
 * @returns {string}
 */
function expandAbbreviations(text) {
  const abbreviations = {
    'Dr.': 'Doctor',
    'Mr.': 'Mister',
    'Mrs.': 'Misses',
    'Ms.': 'Miss',
    'Prof.': 'Professor',
    'St.': 'Street',
    'Ave.': 'Avenue',
    'Blvd.': 'Boulevard',
    'Dept.': 'Department',
    'Corp.': 'Corporation',
    'Inc.': 'Incorporated',
    'Ltd.': 'Limited',
    'vs.': 'versus',
    'etc.': 'etcetera',
    'e.g.': 'for example',
    'i.e.': 'that is',
    'approx.': 'approximately',
    'Jan.': 'January',
    'Feb.': 'February',
    'Mar.': 'March',
    'Apr.': 'April',
    'Aug.': 'August',
    'Sept.': 'September',
    'Oct.': 'October',
    'Nov.': 'November',
    'Dec.': 'December'
  };

  let expanded = text;

  for (const [abbr, full] of Object.entries(abbreviations)) {
    const regex = new RegExp(`\\b${abbr.replace('.', '\\.')}`, 'gi');
    expanded = expanded.replace(regex, full);
  }

  return expanded;
}

/**
 * Detect language of text
 * @param {string} text - Text to analyze
 * @returns {string} ISO 639-3 language code
 */
function detectLanguage(text) {
  if (!text || text.length < 50) {
    return 'eng'; // Default to English for short texts
  }

  try {
    const langCode = franc(text);

    if (langCode === 'und') {
      return 'eng'; // Default to English if undetermined
    }

    return langCode;
  } catch (error) {
    console.warn('Language detection failed:', error.message);
    return 'eng';
  }
}

/**
 * Get language name from code
 * @param {string} code - ISO 639-3 code
 * @returns {string}
 */
function getLanguageName(code) {
  const languageMap = {
    'eng': 'English',
    'spa': 'Spanish',
    'fra': 'French',
    'deu': 'German',
    'ita': 'Italian',
    'por': 'Portuguese',
    'rus': 'Russian',
    'jpn': 'Japanese',
    'kor': 'Korean',
    'cmn': 'Chinese (Mandarin)',
    'ara': 'Arabic',
    'hin': 'Hindi',
    'nld': 'Dutch',
    'pol': 'Polish',
    'tur': 'Turkish'
  };

  return languageMap[code] || 'Unknown';
}

/**
 * Tokenize text into sentences
 * @param {string} text
 * @returns {Array<string>}
 */
function tokenizeSentences(text) {
  const tokenizer = new natural.SentenceTokenizer();
  return tokenizer.tokenize(text);
}

/**
 * Tokenize text into words
 * @param {string} text
 * @returns {Array<string>}
 */
function tokenizeWords(text) {
  const tokenizer = new natural.WordTokenizer();
  return tokenizer.tokenize(text);
}

/**
 * Prepare text for TTS with enhanced pronunciation
 * @param {string} text
 * @param {Object} options
 * @returns {string}
 */
function prepareForTTS(text, options = {}) {
  const {
    expandNumbers = true,
    expandDates = true,
    expandCurrency = true,
    pauseAtHeadings = true
  } = options;

  let prepared = text;

  if (expandNumbers) {
    prepared = expandNumbers_(prepared);
  }

  if (expandDates) {
    prepared = expandDates_(prepared);
  }

  if (expandCurrency) {
    prepared = expandCurrency_(prepared);
  }

  if (pauseAtHeadings) {
    // Add extra pause markers at headings
    prepared = prepared.replace(/^(#{1,6}\s+.+)$/gm, '$1. ');
  }

  return prepared;
}

/**
 * Expand numbers to words
 * @param {string} text
 * @returns {string}
 */
function expandNumbers_(text) {
  // Simple number expansion (can be enhanced with a library)
  return text.replace(/\b(\d+)\b/g, (match) => {
    const num = parseInt(match);
    if (num < 100) {
      return numberToWords(num);
    }
    return match; // Keep larger numbers as digits
  });
}

/**
 * Convert number to words (basic implementation)
 * @param {number} num
 * @returns {string}
 */
function numberToWords(num) {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];

  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  }

  return num.toString(); // Fallback for larger numbers
}

/**
 * Expand dates
 * @param {string} text
 * @returns {string}
 */
function expandDates_(text) {
  // Expand date formats like 01/15/2024
  return text.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g, (match, month, day, year) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[parseInt(month) - 1]} ${day}, ${year}`;
  });
}

/**
 * Expand currency
 * @param {string} text
 * @returns {string}
 */
function expandCurrency_(text) {
  // Expand currency symbols
  text = text.replace(/\$(\d+\.?\d*)/g, '$1 dollars');
  text = text.replace(/€(\d+\.?\d*)/g, '$1 euros');
  text = text.replace(/£(\d+\.?\d*)/g, '$1 pounds');
  return text;
}

module.exports = {
  cleanText,
  detectLanguage,
  getLanguageName,
  tokenizeSentences,
  tokenizeWords,
  prepareForTTS,
  expandAbbreviations,
  fixOCRErrors
};
