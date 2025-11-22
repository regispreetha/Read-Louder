#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs').promises;

const { processPDF } = require('./processors/pdfProcessor');
const { processWord } = require('./processors/wordProcessor');
const { processText } = require('./processors/textFormatter');
const TTSEngine = require('./src/services/ttsEngine');

const program = new Command();

program
  .name('doc-reader')
  .description('CLI tool for converting documents to speech')
  .version('1.0.0');

// Read command
program
  .command('read')
  .description('Read a document aloud')
  .requiredOption('-f, --file <path>', 'Path to document file')
  .option('-v, --voice <voice>', 'Voice to use')
  .option('-s, --speed <speed>', 'Reading speed (0.5-3.0)', '1.0')
  .option('-p, --provider <provider>', 'TTS provider (system, azure, google, polly, openai)', 'system')
  .action(async (options) => {
    const spinner = ora('Processing document...').start();

    try {
      // Process document
      const filePath = path.resolve(options.file);
      const ext = path.extname(filePath).toLowerCase();

      let document;
      switch (ext) {
        case '.pdf':
          document = await processPDF(filePath);
          break;
        case '.docx':
        case '.doc':
          document = await processWord(filePath);
          break;
        case '.txt':
        case '.md':
        case '.rtf':
          document = await processText(filePath);
          break;
        default:
          throw new Error(`Unsupported file format: ${ext}`);
      }

      spinner.succeed('Document processed successfully');

      console.log(chalk.cyan('\nDocument Information:'));
      console.log(chalk.white(`Title: ${document.metadata.title}`));
      console.log(chalk.white(`Words: ${document.statistics.wordCount.toLocaleString()}`));
      console.log(chalk.white(`Estimated time: ${document.statistics.estimatedReadingTime} minutes`));
      console.log(chalk.white(`Language: ${document.language}\n`));

      // Initialize TTS
      spinner.start('Initializing text-to-speech...');
      const ttsEngine = new TTSEngine({
        provider: options.provider,
        voice: options.voice,
        speed: parseFloat(options.speed)
      });

      await ttsEngine.initialize();
      spinner.succeed('TTS initialized');

      console.log(chalk.green('\n▶ Starting playback...\n'));

      // Read document
      const sentences = document.text.split(/[.!?]+/).filter(s => s.trim().length > 0);

      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].trim();

        if (sentence.length === 0) continue;

        console.log(chalk.gray(`[${i + 1}/${sentences.length}]`), chalk.white(sentence.substring(0, 80) + '...'));

        await ttsEngine.speak(sentence);
      }

      console.log(chalk.green('\n✓ Playback completed\n'));
    } catch (error) {
      spinner.fail('Error');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Convert command (generate audio file)
program
  .command('convert')
  .description('Convert document to audio file')
  .requiredOption('-i, --input <path>', 'Input document path')
  .requiredOption('-o, --output <path>', 'Output audio file path')
  .option('-v, --voice <voice>', 'Voice to use')
  .option('-s, --speed <speed>', 'Reading speed (0.5-3.0)', '1.0')
  .option('-p, --provider <provider>', 'TTS provider (azure, google, polly, openai)', 'openai')
  .option('-f, --format <format>', 'Audio format (mp3, wav)', 'mp3')
  .action(async (options) => {
    const spinner = ora('Processing document...').start();

    try {
      // Process document
      const filePath = path.resolve(options.input);
      const ext = path.extname(filePath).toLowerCase();

      let document;
      switch (ext) {
        case '.pdf':
          document = await processPDF(filePath);
          break;
        case '.docx':
        case '.doc':
          document = await processWord(filePath);
          break;
        case '.txt':
        case '.md':
        case '.rtf':
          document = await processText(filePath);
          break;
        default:
          throw new Error(`Unsupported file format: ${ext}`);
      }

      spinner.text = 'Generating audio...';

      // Initialize TTS
      const ttsEngine = new TTSEngine({
        provider: options.provider,
        voice: options.voice,
        speed: parseFloat(options.speed)
      });

      await ttsEngine.initialize();

      // Generate audio file
      const outputPath = path.resolve(options.output);
      await ttsEngine.generateAudioFile(document.text, outputPath, {
        format: options.format
      });

      spinner.succeed(`Audio file created: ${outputPath}`);

      console.log(chalk.cyan('\nFile Information:'));
      console.log(chalk.white(`Input: ${document.metadata.title}`));
      console.log(chalk.white(`Output: ${outputPath}`));
      console.log(chalk.white(`Duration: ~${document.statistics.estimatedReadingTime} minutes\n`));
    } catch (error) {
      spinner.fail('Error');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Batch convert command
program
  .command('batch')
  .description('Convert multiple documents to audio files')
  .requiredOption('-f, --folder <path>', 'Input folder path')
  .option('-o, --output <path>', 'Output folder path', './audio-output')
  .option('-v, --voice <voice>', 'Voice to use')
  .option('-s, --speed <speed>', 'Reading speed (0.5-3.0)', '1.0')
  .option('-p, --provider <provider>', 'TTS provider', 'openai')
  .action(async (options) => {
    const spinner = ora('Scanning folder...').start();

    try {
      const folderPath = path.resolve(options.folder);
      const outputPath = path.resolve(options.output);

      // Create output folder
      await fs.mkdir(outputPath, { recursive: true });

      // Get all supported files
      const files = await fs.readdir(folderPath);
      const supportedExts = ['.pdf', '.docx', '.doc', '.txt', '.md', '.rtf'];
      const documentFiles = files.filter(file =>
        supportedExts.includes(path.extname(file).toLowerCase())
      );

      spinner.succeed(`Found ${documentFiles.length} documents`);

      if (documentFiles.length === 0) {
        console.log(chalk.yellow('No supported documents found'));
        return;
      }

      // Initialize TTS once
      const ttsEngine = new TTSEngine({
        provider: options.provider,
        voice: options.voice,
        speed: parseFloat(options.speed)
      });

      await ttsEngine.initialize();

      // Process each file
      for (let i = 0; i < documentFiles.length; i++) {
        const file = documentFiles[i];
        const filePath = path.join(folderPath, file);

        spinner.start(`[${i + 1}/${documentFiles.length}] Processing ${file}...`);

        try {
          const ext = path.extname(file).toLowerCase();
          let document;

          switch (ext) {
            case '.pdf':
              document = await processPDF(filePath);
              break;
            case '.docx':
            case '.doc':
              document = await processWord(filePath);
              break;
            default:
              document = await processText(filePath);
          }

          // Generate audio
          const outputFileName = path.basename(file, ext) + '.mp3';
          const audioPath = path.join(outputPath, outputFileName);

          await ttsEngine.generateAudioFile(document.text, audioPath);

          spinner.succeed(`[${i + 1}/${documentFiles.length}] ${file} → ${outputFileName}`);
        } catch (error) {
          spinner.fail(`[${i + 1}/${documentFiles.length}] Failed: ${file}`);
          console.error(chalk.red('  Error:'), error.message);
        }
      }

      console.log(chalk.green('\n✓ Batch conversion completed\n'));
      console.log(chalk.white(`Output folder: ${outputPath}\n`));
    } catch (error) {
      spinner.fail('Error');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Info command
program
  .command('info')
  .description('Get information about a document')
  .requiredOption('-f, --file <path>', 'Path to document file')
  .action(async (options) => {
    const spinner = ora('Processing document...').start();

    try {
      const filePath = path.resolve(options.file);
      const ext = path.extname(filePath).toLowerCase();

      let document;
      switch (ext) {
        case '.pdf':
          document = await processPDF(filePath);
          break;
        case '.docx':
        case '.doc':
          document = await processWord(filePath);
          break;
        case '.txt':
        case '.md':
        case '.rtf':
          document = await processText(filePath);
          break;
        default:
          throw new Error(`Unsupported file format: ${ext}`);
      }

      spinner.succeed('Document processed');

      console.log(chalk.cyan('\n📄 Document Information\n'));
      console.log(chalk.white('Title:'), document.metadata.title);
      if (document.metadata.author && document.metadata.author !== 'Unknown') {
        console.log(chalk.white('Author:'), document.metadata.author);
      }
      console.log(chalk.white('Type:'), document.fileType);
      console.log(chalk.white('Language:'), document.language);

      console.log(chalk.cyan('\n📊 Statistics\n'));
      console.log(chalk.white('Words:'), document.statistics.wordCount.toLocaleString());
      console.log(chalk.white('Characters:'), document.statistics.characterCount.toLocaleString());
      console.log(chalk.white('Paragraphs:'), document.statistics.paragraphs);
      if (document.statistics.pages) {
        console.log(chalk.white('Pages:'), document.statistics.pages);
      }
      console.log(chalk.white('Est. reading time:'), `${document.statistics.estimatedReadingTime} minutes`);

      if (document.chapters && document.chapters.length > 1) {
        console.log(chalk.cyan('\n📑 Chapters\n'));
        document.chapters.forEach(chapter => {
          console.log(chalk.white(`  ${chapter.number}. ${chapter.title}`), chalk.gray(`(${chapter.wordCount} words)`));
        });
      }

      console.log();
    } catch (error) {
      spinner.fail('Error');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program.parse();
