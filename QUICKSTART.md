# Quick Start Guide

Get started with Read Louder in 5 minutes!

## 1. Installation (2 minutes)

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

## 2. First Run (1 minute)

### Option A: Desktop App
```bash
npm start
```

### Option B: CLI Tool
```bash
# Read a document
doc-reader read --file path/to/your/document.pdf

# Get document info
doc-reader info --file path/to/your/document.pdf
```

### Option C: API Server
```bash
npm run api
```

## 3. Basic Usage (2 minutes)

### Desktop App
1. Drag & drop a PDF or Word document
2. Press **Space** to play/pause
3. Adjust speed with the controls
4. Add bookmarks with the bookmark button

### CLI Examples
```bash
# Convert PDF to audio
doc-reader convert \
  --input report.pdf \
  --output report.mp3 \
  --provider openai \
  --voice nova

# Batch convert folder
doc-reader batch \
  --folder ./documents \
  --output ./audio-output
```

### API Examples
```bash
# Process a document
curl -X POST http://localhost:3001/api/process-document \
  -F "file=@document.pdf"

# Generate audio from text
curl -X POST http://localhost:3001/api/generate-audio \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "provider": "system"}'
```

## 4. Configuration (Optional)

### Use Cloud TTS (Better Quality)

Edit `.env` file:
```env
# For OpenAI TTS (Recommended)
OPENAI_API_KEY=your-key-here

# Or Azure
AZURE_SPEECH_KEY=your-key-here
AZURE_SPEECH_REGION=eastus
```

Get API keys:
- OpenAI: https://platform.openai.com/api-keys
- Azure: https://azure.microsoft.com/en-us/services/cognitive-services/speech-services/

### Keyboard Shortcuts
- `Space` - Play/Pause
- `Ctrl/Cmd + O` - Open file
- `Ctrl/Cmd + B` - Bookmarks
- `Ctrl/Cmd + ,` - Settings

## 5. Common Tasks

### Convert Multiple Documents
```bash
doc-reader batch \
  --folder ./my-documents \
  --output ./audio-library \
  --voice nova \
  --provider openai
```

### Integrate with n8n
1. Start API server: `npm run api`
2. In n8n, use HTTP Request node
3. POST to `http://localhost:3001/api/convert-document`
4. Upload file via multipart form data
5. Receive audio file

### Export Audio from Desktop App
1. Open document
2. Settings → Voice → Select cloud provider
3. Export button → Save audio file

## Troubleshooting

**Issue**: TTS not working
- **Solution**: Use system voices first (no API key needed)
- Check: Settings → Provider → "System Voices"

**Issue**: Document won't open
- **Solution**: Check file format (.pdf, .docx, .doc, .txt supported)
- Try: `doc-reader info --file yourfile.pdf`

**Issue**: Audio quality poor
- **Solution**: Use cloud TTS providers
- Recommended: OpenAI (best quality), Azure (most voices)

## Next Steps

- Read the full [README.md](README.md)
- Try different voice profiles in Settings
- Explore CLI automation options
- Set up n8n integration for workflows

## Support

- GitHub Issues: Report bugs or request features
- Email: support@bloomingtreefinancials.com

---

**You're all set! Start reading documents aloud! 🎙️**
