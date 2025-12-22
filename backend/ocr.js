const { OpenAI } = require("openai");
const fs = require("node:fs/promises");
const mime = require("mime-types");
const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

// Configure multer for file uploads
const upload = multer({ dest: "uploads/" });

// --- CEREBRAS AI Configuration ---
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
const client = new OpenAI({
    baseURL: "https://api.cerebras.ai/v1",
    apiKey: CEREBRAS_API_KEY,
});

// --- Utility Functions ---

/**
 * Converts an image file to a base64 data URL.
 * @param {string} filePath - The path to the image file.
 * @param {string} mimeType - The MIME type of the image.
 * @returns {Promise<string>} A promise that resolves to the data URL.
 */
async function imageToDataURL(filePath, mimeType) {
    const fileData = await fs.readFile(filePath);
    const base64Data = fileData.toString("base64");
    return `data:${mimeType};base64,${base64Data}`;
}

/**
 * Cleans up old files from the uploads directory.
 */
async function cleanupUploads() {
    const uploadsDir = path.join(__dirname, "uploads");
    try {
        if (!fs.existsSync(uploadsDir)) {
            await fs.mkdir(uploadsDir, { recursive: true });
        }

        const files = await fs.readdir(uploadsDir);
        const now = Date.now();

        for (const file of files) {
            const filePath = path.join(uploadsDir, file);
            const stats = await fs.stat(filePath);

            // Delete files older than 1 hour (3600000 ms)
            if (now - stats.mtime.getTime() > 3600000) {
                await fs.unlink(filePath);
                console.log(`Deleted old file: ${filePath}`);
            }
        }
    } catch (err) {
        console.error("Error during upload cleanup:", err);
    }
}


// --- API Endpoints ---

// Health check endpoint
app.get("/health", (_, res) => {
    res.status(200).json({ status: "ok", message: "Server is healthy." });
});

// Single image OCR endpoint
app.post("/ocr", upload.single("image"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No image file was provided." });
    }

    const { path: filePath, originalname } = req.file;

    try {
        const mimeType = mime.lookup(originalname) || "image/jpeg";
        const imageDataURL = await imageToDataURL(filePath, mimeType);

        const completion = await client.chat.completions.create({
            model: "qwen-3-235b-a22b-instruct-2507", // Tier 2 Heavy Reasoning Model
            max_tokens: 4096,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "You are an expert OCR system for webcomics. Your task is to extract ALL text from the provided image. This includes dialogue, narration boxes, sound effects, and any other text. Return ONLY the extracted text as a single, clean paragraph. If no text is found, respond with 'No text detected in this image.'",
                        },
                        {
                            type: "image_url",
                            image_url: { url: imageDataURL },
                        },
                    ],
                },
            ],
        });

        const extractedText = completion.choices[0]?.message?.content?.trim() || "Failed to extract text.";
        res.json({ text: extractedText });

    } catch (error) {
        console.error("Cerebras API Error (/ocr):", error);
        res.status(500).json({
            error: "An error occurred during text extraction.",
            details: error.message,
        });
    } finally {
        // Ensure the uploaded file is always deleted
        await fs.unlink(filePath).catch(err => console.error(`Failed to delete temp file ${filePath}:`, err));
    }
});


// Batch image OCR endpoint
app.post("/ocr-batch", upload.array("images", 10), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No image files were provided." });
    }

    const filesToDelete = req.files.map(f => f.path);

    try {
        const imageContent = [];
        for (const file of req.files) {
            const mimeType = mime.lookup(file.originalname) || "image/jpeg";
            const imageDataURL = await imageToDataURL(file.path, mimeType);
            imageContent.push({
                type: "image_url",
                image_url: { url: imageDataURL },
            });
        }

        const completion = await client.chat.completions.create({
            model: "qwen-3-235b-a22b-instruct-2507",
            max_tokens: 8192,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "You are an expert OCR system for webcomics. You will receive a batch of images. For each image, extract ALL text (dialogue, narration, sound effects). Present the output sequentially. Start each image's text with 'IMAGE X:' (where X is the 1-based index of the image). If an image contains no text, write 'No text detected in this image.' for that entry.",
                        },
                        ...imageContent,
                    ],
                },
            ],
        });

        const extractedText = completion.choices[0]?.message?.content?.trim() || "Failed to extract text from batch.";
        res.json({ text: extractedText });

    } catch (error) {
        console.error("Cerebras API Error (/ocr-batch):", error);
        res.status(500).json({
            error: "An error occurred during batch text extraction.",
            details: error.message,
        });
    } finally {
        // Clean up all uploaded files
        for (const filePath of filesToDelete) {
            await fs.unlink(filePath).catch(err => console.error(`Failed to delete temp file ${filePath}:`, err));
        }
    }
});


// --- Server Initialization ---
// Create uploads directory if it doesn't exist and run periodic cleanup
(async () => {
    await cleanupUploads(); // Initial cleanup
    setInterval(cleanupUploads, 3600000); // Run cleanup every hour
})();


module.exports = app;
