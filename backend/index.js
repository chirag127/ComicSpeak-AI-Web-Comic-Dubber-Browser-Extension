const app = require('./ocr');
const PORT = process.env.PORT || 3000;

// Check if CEREBRAS_API_KEY is set
if (!process.env.CEREBRAS_API_KEY) {
  console.error("ERROR: CEREBRAS_API_KEY is not set in the environment variables.");
  console.error("Please create a .env file with your CEREBRAS_API_KEY or set it in your environment.");
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`OCR server running on http://localhost:${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`OCR endpoint available at http://localhost:${PORT}/ocr`);
});
