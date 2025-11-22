#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');

const { processPDF } = require('./processors/pdfProcessor');
const { processWord } = require('./processors/wordProcessor');
const { processText } = require('./processors/textFormatter');
const TTSEngine = require('./src/services/ttsEngine');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 3001;
const WEBHOOK_URL = process.env.WEBHOOK_URL || null;

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Read Louder API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Process document endpoint
app.post('/api/process-document', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

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
        // Cleanup uploaded file
        await fs.unlink(filePath);
        return res.status(400).json({ error: `Unsupported file format: ${ext}` });
    }

    // Cleanup uploaded file
    await fs.unlink(filePath);

    res.json({
      success: true,
      document: {
        title: document.metadata.title,
        author: document.metadata.author,
        language: document.language,
        statistics: document.statistics,
        chapters: document.chapters,
        text: document.text.substring(0, 1000) + '...' // Preview only
      }
    });
  } catch (error) {
    console.error('Error processing document:', error);

    // Cleanup uploaded file
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate audio from text
app.post('/api/generate-audio', async (req, res) => {
  try {
    const { text, voice, speed, provider } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Initialize TTS engine
    const ttsEngine = new TTSEngine({
      provider: provider || 'openai',
      voice: voice || null,
      speed: parseFloat(speed) || 1.0
    });

    await ttsEngine.initialize();

    // Generate audio
    const outputPath = path.join(__dirname, 'audio', `audio-${Date.now()}.mp3`);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const result = await ttsEngine.generateAudioFile(text, outputPath);

    if (result.success) {
      // Return audio file
      res.sendFile(outputPath, async (err) => {
        // Cleanup after sending
        try {
          await fs.unlink(outputPath);
        } catch (e) {
          console.error('Error cleaning up audio file:', e);
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error generating audio:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Convert document to audio
app.post('/api/convert-document', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { voice, speed, provider } = req.body;

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    // Process document
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
        await fs.unlink(filePath);
        return res.status(400).json({ error: `Unsupported file format: ${ext}` });
    }

    // Cleanup uploaded file
    await fs.unlink(filePath);

    // Initialize TTS engine
    const ttsEngine = new TTSEngine({
      provider: provider || 'openai',
      voice: voice || null,
      speed: parseFloat(speed) || 1.0
    });

    await ttsEngine.initialize();

    // Generate audio
    const outputPath = path.join(__dirname, 'audio/exports', `${document.metadata.title}-${Date.now()}.mp3`);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const result = await ttsEngine.generateAudioFile(document.text, outputPath);

    if (result.success) {
      // Trigger webhook if configured
      if (WEBHOOK_URL) {
        try {
          const fetch = require('node-fetch');
          await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'conversion_complete',
              document: {
                title: document.metadata.title,
                author: document.metadata.author
              },
              audio: {
                path: outputPath,
                size: result.size
              },
              timestamp: new Date().toISOString()
            })
          });
        } catch (webhookError) {
          console.error('Webhook error:', webhookError);
        }
      }

      // Return audio file
      res.sendFile(outputPath);
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error converting document:', error);

    // Cleanup uploaded file
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get available voices
app.get('/api/voices', async (req, res) => {
  try {
    const { provider } = req.query;

    const ttsEngine = new TTSEngine({
      provider: provider || 'system'
    });

    const voices = await ttsEngine.getAvailableVoices();

    res.json({
      success: true,
      provider: provider || 'system',
      voices
    });
  } catch (error) {
    console.error('Error getting voices:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Batch conversion endpoint
app.post('/api/batch-convert', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { voice, speed, provider } = req.body;

    // Initialize TTS engine once
    const ttsEngine = new TTSEngine({
      provider: provider || 'openai',
      voice: voice || null,
      speed: parseFloat(speed) || 1.0
    });

    await ttsEngine.initialize();

    const results = [];

    for (const file of req.files) {
      try {
        const filePath = file.path;
        const ext = path.extname(file.originalname).toLowerCase();

        // Process document
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
            throw new Error(`Unsupported format: ${ext}`);
        }

        // Cleanup uploaded file
        await fs.unlink(filePath);

        // Generate audio
        const outputFileName = `${document.metadata.title}-${Date.now()}.mp3`;
        const outputPath = path.join(__dirname, 'audio/exports', outputFileName);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        await ttsEngine.generateAudioFile(document.text, outputPath);

        results.push({
          success: true,
          fileName: file.originalname,
          title: document.metadata.title,
          audioFile: outputFileName
        });
      } catch (error) {
        results.push({
          success: false,
          fileName: file.originalname,
          error: error.message
        });

        // Cleanup uploaded file
        try {
          await fs.unlink(file.path);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error in batch conversion:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🎙️  Read Louder API Server`);
  console.log(`   Running on http://localhost:${PORT}`);
  console.log(`   Webhook URL: ${WEBHOOK_URL || 'Not configured'}\n`);
  console.log(`📡 Available endpoints:`);
  console.log(`   GET  /health`);
  console.log(`   POST /api/process-document`);
  console.log(`   POST /api/generate-audio`);
  console.log(`   POST /api/convert-document`);
  console.log(`   POST /api/batch-convert`);
  console.log(`   GET  /api/voices\n`);
});

module.exports = app;
