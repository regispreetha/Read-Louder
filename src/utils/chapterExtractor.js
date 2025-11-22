/**
 * Extract chapters and sections from document text
 * @param {string} text - Document text
 * @param {string} documentTitle - Document title
 * @returns {Array<Object>} Array of chapter objects
 */
function extractChapters(text, documentTitle = 'Document') {
  const chapters = [];
  const lines = text.split('\n');

  let currentChapter = null;
  let currentContent = [];
  let chapterNumber = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if line is a chapter heading
    const chapterInfo = identifyChapterHeading(line, i);

    if (chapterInfo) {
      // Save previous chapter if exists
      if (currentChapter) {
        currentChapter.content = currentContent.join('\n').trim();
        currentChapter.endLine = i - 1;
        currentChapter.wordCount = countWords(currentChapter.content);
        chapters.push(currentChapter);
      }

      // Start new chapter
      chapterNumber++;
      currentChapter = {
        number: chapterNumber,
        title: chapterInfo.title,
        level: chapterInfo.level,
        startLine: i,
        endLine: null,
        content: '',
        wordCount: 0
      };

      currentContent = [];
    } else if (currentChapter) {
      // Add to current chapter content
      currentContent.push(line);
    } else {
      // Before first chapter - create introduction
      if (chapters.length === 0 && currentContent.length === 0) {
        chapterNumber++;
        currentChapter = {
          number: chapterNumber,
          title: 'Introduction',
          level: 1,
          startLine: 0,
          endLine: null,
          content: '',
          wordCount: 0
        };
      }
      currentContent.push(line);
    }
  }

  // Save last chapter
  if (currentChapter) {
    currentChapter.content = currentContent.join('\n').trim();
    currentChapter.endLine = lines.length - 1;
    currentChapter.wordCount = countWords(currentChapter.content);
    chapters.push(currentChapter);
  }

  // If no chapters found, create single chapter with all content
  if (chapters.length === 0) {
    chapters.push({
      number: 1,
      title: documentTitle,
      level: 1,
      startLine: 0,
      endLine: lines.length - 1,
      content: text,
      wordCount: countWords(text)
    });
  }

  return chapters;
}

/**
 * Identify if a line is a chapter heading
 * @param {string} line
 * @param {number} lineNumber
 * @returns {Object|null}
 */
function identifyChapterHeading(line, lineNumber) {
  if (!line || line.length === 0) {
    return null;
  }

  // Pattern 1: Markdown headings (# Heading)
  const markdownMatch = line.match(/^(#{1,6})\s+(.+)$/);
  if (markdownMatch) {
    return {
      title: markdownMatch[2].trim(),
      level: markdownMatch[1].length,
      type: 'markdown'
    };
  }

  // Pattern 2: Chapter X, Chapter X:, CHAPTER X
  const chapterMatch = line.match(/^(?:chapter|ch\.?)\s+(\d+|[IVX]+)(?:[\s:.-]+(.*))?$/i);
  if (chapterMatch) {
    const title = chapterMatch[2] ? chapterMatch[2].trim() : `Chapter ${chapterMatch[1]}`;
    return {
      title,
      level: 1,
      type: 'chapter'
    };
  }

  // Pattern 3: Numbered sections (1. Introduction, 1.1 Overview)
  const numberedMatch = line.match(/^(\d+(?:\.\d+)*)[.)]\s+(.+)$/);
  if (numberedMatch && numberedMatch[2].length > 3) {
    const level = numberedMatch[1].split('.').length;
    return {
      title: numberedMatch[2].trim(),
      level,
      type: 'numbered'
    };
  }

  // Pattern 4: ALL CAPS headings (minimum 3 words)
  if (line === line.toUpperCase() && line.split(/\s+/).length >= 2 && line.length > 5 && line.length < 100) {
    return {
      title: toTitleCase(line),
      level: 1,
      type: 'caps'
    };
  }

  // Pattern 5: Part/Section headings
  const partMatch = line.match(/^(?:part|section)\s+(\d+|[IVX]+)(?:[\s:.-]+(.*))?$/i);
  if (partMatch) {
    const title = partMatch[2] ? partMatch[2].trim() : `Part ${partMatch[1]}`;
    return {
      title,
      level: 1,
      type: 'part'
    };
  }

  // Pattern 6: Underlined headings (next line is ===== or -----)
  // This would require looking ahead, handled separately

  return null;
}

/**
 * Convert text to title case
 * @param {string} text
 * @returns {string}
 */
function toTitleCase(text) {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Count words in text
 * @param {string} text
 * @returns {number}
 */
function countWords(text) {
  if (!text) return 0;
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Extract table of contents from chapters
 * @param {Array<Object>} chapters
 * @returns {Array<Object>}
 */
function generateTableOfContents(chapters) {
  return chapters.map(chapter => ({
    number: chapter.number,
    title: chapter.title,
    level: chapter.level,
    startLine: chapter.startLine,
    wordCount: chapter.wordCount,
    estimatedTime: Math.ceil(chapter.wordCount / 200) // minutes
  }));
}

/**
 * Find chapter by line number
 * @param {Array<Object>} chapters
 * @param {number} lineNumber
 * @returns {Object|null}
 */
function findChapterByLine(chapters, lineNumber) {
  return chapters.find(chapter =>
    lineNumber >= chapter.startLine && lineNumber <= chapter.endLine
  ) || null;
}

/**
 * Get chapter navigation info
 * @param {Array<Object>} chapters
 * @param {number} currentChapterNumber
 * @returns {Object}
 */
function getChapterNavigation(chapters, currentChapterNumber) {
  const currentIndex = chapters.findIndex(ch => ch.number === currentChapterNumber);

  return {
    current: chapters[currentIndex],
    previous: currentIndex > 0 ? chapters[currentIndex - 1] : null,
    next: currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null,
    total: chapters.length,
    currentIndex: currentIndex + 1
  };
}

module.exports = {
  extractChapters,
  identifyChapterHeading,
  generateTableOfContents,
  findChapterByLine,
  getChapterNavigation
};
