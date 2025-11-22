# Read Louder 🎙️

A comprehensive desktop application that extracts text from PDF and Word documents and converts them to natural-sounding speech with advanced reading controls and customization options.

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-1.0.0-orange)

## Features

### Document Processing
- **Multi-format support**: PDF, Word (.docx, .doc), Text files (.txt, .md, .rtf)
- **Intelligent text extraction** with automatic cleanup and formatting
- **OCR support** for scanned documents
- **Chapter detection** and navigation
- **Multi-language detection** and processing
- **Password-protected PDF** support

### Text-to-Speech
- **Multiple TTS providers**:
  - System voices (Windows SAPI, macOS Speech Synthesis, Linux eSpeak) - **FREE**
  - Azure Cognitive Services (premium neural voices)
  - Google Cloud Text-to-Speech
  - Amazon Polly
  - OpenAI TTS (high-quality voices)
- **Voice customization**: Speed (0.5x-3.0x), pitch, volume control
- **Natural pronunciation** with abbreviation expansion and smart text processing

### Reading Controls
- **Professional playback controls**: Play, pause, stop, skip forward/backward
- **Real-time text highlighting** with auto-scroll
- **Progress tracking** with time estimation
- **Bookmark system** for saving positions
- **Chapter navigation** for structured documents
- **Resume from last position**

### User Interface
- **Modern, intuitive design** with dark theme
- **Drag-and-drop** file support
- **Real-time document viewer** with sentence highlighting
- **Comprehensive settings panel**
- **Bookmark manager** with quick navigation
- **Progress visualization**

### Automation & Integration
- **CLI tool** for batch processing and automation
- **REST API server** for workflow integration
- **n8n compatibility** for business automation
- **Webhook support** for event notifications
- **Batch conversion** capabilities

## Installation

### Prerequisites
- Node.js 16+ and npm
- Git (optional, for cloning)

### Quick Start

1. **Clone or download** the repository:
```bash
git clone https://github.com/yourusername/read-louder.git
cd read-louder
```

2. **Install dependencies**:
```bash
npm install
```

3. **Run in development mode**:
```bash
npm run dev
```

4. **Build for production**:
```bash
# Build React frontend
npm run build

# Start Electron app
npm start
```

### Build Installers

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux

# All platforms
npm run build:all
```

Installers will be created in the `dist/` directory.

## Usage

### Desktop Application

1. **Launch the application**
2. **Open a document** by:
   - Dragging and dropping a file
   - Clicking "Browse Files"
   - Using Ctrl/Cmd + O
3. **Adjust settings** (voice, speed, pitch) in the Settings panel
4. **Press Play** or spacebar to start reading
5. **Add bookmarks** to save important positions
6. **Navigate chapters** using the chapter list

### Keyboard Shortcuts

- `Space` - Play/Pause
- `Ctrl/Cmd + O` - Open file
- `Ctrl/Cmd + B` - Toggle bookmarks
- `Ctrl/Cmd + ,` - Toggle settings

### CLI Usage

The CLI tool provides command-line access to all features:

#### Read a document aloud
```bash
doc-reader read --file report.pdf --voice Jenny --speed 1.2
```

#### Convert document to audio file
```bash
doc-reader convert \
  --input report.pdf \
  --output audio/report.mp3 \
  --voice "en-US-JennyNeural" \
  --provider azure \
  --speed 1.1
```

#### Batch convert multiple documents
```bash
doc-reader batch \
  --folder ./documents \
  --output ./audio-library \
  --voice alloy \
  --provider openai \
  --speed 1.0
```

#### Get document information
```bash
doc-reader info --file document.pdf
```

### API Server

Start the REST API server for integration with other tools:

```bash
npm run api

# Or with custom port and webhook
PORT=3001 WEBHOOK_URL=http://n8n.example.com/webhook npm run api
```

#### API Endpoints

**Process Document**
```bash
POST /api/process-document
Content-Type: multipart/form-data

# Returns document information (title, stats, chapters, etc.)
```

**Generate Audio from Text**
```bash
POST /api/generate-audio
Content-Type: application/json

{
  "text": "Text to convert to speech",
  "voice": "alloy",
  "speed": 1.0,
  "provider": "openai"
}

# Returns audio file (MP3)
```

**Convert Document to Audio**
```bash
POST /api/convert-document
Content-Type: multipart/form-data

# Returns audio file of entire document
```

**Batch Conversion**
```bash
POST /api/batch-convert
Content-Type: multipart/form-data

# Upload multiple files, returns status for each
```

**Get Available Voices**
```bash
GET /api/voices?provider=azure

# Returns list of available voices for the provider
```

### n8n Integration

Read Louder can be integrated into n8n workflows:

1. **Start the API server**:
```bash
PORT=3001 WEBHOOK_URL=http://n8n.bloomingminds.tech/webhook npm run api
```

2. **Create an n8n workflow**:
   - Use HTTP Request node to call `/api/convert-document`
   - Upload document via multipart form data
   - Receive audio file in response
   - Save or distribute the audio file

3. **Example workflow**:
   - Trigger: Email received with PDF attachment
   - Action: Convert PDF to audio using Read Louder API
   - Action: Send audio file via email or save to cloud storage

## Configuration

### TTS Provider Setup

#### System Voices (Default - Free)
No configuration needed. Uses built-in OS voices.

#### Azure Cognitive Services
```bash
export AZURE_SPEECH_KEY="your-azure-key"
export AZURE_SPEECH_REGION="eastus"
```

Get your API key from: https://azure.microsoft.com/en-us/services/cognitive-services/speech-services/

#### Google Cloud TTS
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

Setup: https://cloud.google.com/text-to-speech/docs/quickstart-client-libraries

#### Amazon Polly
```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"
```

Setup: https://aws.amazon.com/polly/

#### OpenAI TTS
```bash
export OPENAI_API_KEY="your-openai-key"
```

Get your API key from: https://platform.openai.com/api-keys

### Environment Variables

Create a `.env` file in the project root:

```env
# TTS Provider Settings
AZURE_SPEECH_KEY=your-key-here
AZURE_SPEECH_REGION=eastus
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
OPENAI_API_KEY=your-key

# API Server Settings
PORT=3001
WEBHOOK_URL=http://n8n.example.com/webhook
```

## Project Structure

```
read-louder/
├── main.js                 # Electron main process
├── preload.js              # Electron preload script
├── cli.js                  # CLI interface
├── api-server.js           # REST API server
├── package.json
├── vite.config.js
│
├── src/
│   ├── main.jsx            # React entry point
│   ├── App.jsx             # Main React component
│   │
│   ├── components/         # React UI components
│   │   ├── DocumentViewer.jsx
│   │   ├── TTSControls.jsx
│   │   ├── SettingsPanel.jsx
│   │   ├── BookmarkManager.jsx
│   │   └── ProgressTracker.jsx
│   │
│   ├── services/           # Core services
│   │   ├── ttsEngine.js
│   │   └── audioController.js
│   │
│   ├── utils/              # Utility functions
│   │   ├── textCleaner.js
│   │   └── chapterExtractor.js
│   │
│   ├── store/              # State management
│   │   └── appStore.js
│   │
│   └── styles/             # CSS styles
│       ├── global.css
│       └── App.css
│
├── processors/             # Document processors
│   ├── pdfProcessor.js
│   ├── wordProcessor.js
│   └── textFormatter.js
│
├── assets/                 # Application assets
│   ├── icons/
│   └── sounds/
│
└── audio/                  # Generated audio files
    ├── cache/
    └── exports/
```

## Use Cases

### For Professionals
- **Review documents** while multitasking
- **Process financial reports** during commutes
- **Create audio versions** of presentations
- **Batch convert** regular reports to audio

### For Education
- **Convert study materials** to audio
- **Create audiobooks** from textbooks
- **Accessibility support** for students
- **Language learning** with pronunciation

### For Content Creators
- **Generate podcast-style** content from written articles
- **Create audio previews** for blog posts
- **Accessibility enhancement** for websites

### For Businesses
- **Automate documentation** audio generation
- **Client presentation** audio narration
- **Multi-language support** for international documents
- **Integration with workflows** via n8n

## Advanced Features

### Custom Voice Profiles
Save your preferred settings as profiles:

```javascript
// In Settings Panel
{
  "name": "Business Reports",
  "provider": "azure",
  "voice": "en-US-JennyNeural",
  "speed": 1.1,
  "pitch": 2,
  "volume": 85
}
```

### Batch Processing Script
```bash
# Process all PDFs in a folder
for file in documents/*.pdf; do
  doc-reader convert \
    --input "$file" \
    --output "audio/$(basename "$file" .pdf).mp3" \
    --provider openai \
    --voice nova
done
```

### n8n Webhook Integration
```javascript
// Example n8n webhook response handling
{
  "event": "conversion_complete",
  "document": {
    "title": "Quarterly Report",
    "author": "Finance Team"
  },
  "audio": {
    "path": "/audio/exports/report.mp3",
    "size": 15728640
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Troubleshooting

### Common Issues

**Documents not processing**
- Check file format is supported (.pdf, .docx, .doc, .txt, .md, .rtf)
- Verify file is not corrupted
- For password-protected PDFs, ensure password support is enabled

**TTS not working**
- Verify API keys are correctly set in environment variables
- Check internet connection for cloud TTS providers
- Try system voices first to isolate the issue

**Poor audio quality**
- Use cloud TTS providers for better quality (Azure, Google, OpenAI)
- Adjust speed setting (1.0x is optimal)
- Ensure source document has clean text

**Build errors**
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version (16+ required)
- Clear `node_modules` and reinstall if issues persist

## Performance Tips

- **Large documents**: Processing may take time; be patient
- **Memory**: Close other applications for very large documents
- **Cloud TTS**: Requires internet connection and API quotas
- **Batch processing**: Use CLI for better performance with many files

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built with Electron, React, and Node.js
- TTS powered by multiple providers (Azure, Google, AWS, OpenAI)
- Document processing with pdf-parse, mammoth, and textract
- UI icons from Lucide React

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Email: support@bloomingtreefinancials.com

## Roadmap

- [ ] OCR support for scanned documents
- [ ] Real-time collaboration features
- [ ] Cloud storage integration (Dropbox, Google Drive)
- [ ] Mobile companion app
- [ ] Advanced voice cloning
- [ ] Podcast-style multi-voice narration
- [ ] Translation and multi-language support
- [ ] Chrome extension for web content

---

**Made with ❤️ by Blooming Tree Financials**

Perfect for document review, accessibility, education, and automation workflows.
