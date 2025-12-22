/**
 * @file Content script for the Comic Dubber extension.
 * This script is injected into web pages to find, process, and read comic images.
 */

const ComicReader = {
    // --- STATE ---
    state: {
        isReading: false,
        textQueue: [],
        imageQueue: [],
        processedImages: new Set(),
        currentHighlightedImage: null,
        currentImageIndex: -1,
        currentBatchIndex: 0,
        batchResults: {},
    },

    // --- SETTINGS ---
    settings: {
        voiceIndex: 0,
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        batchSize: 5,
        backendUrl: "https://visual-web-comic-dubber.onrender.com",
    },

    // --- INITIALIZATION ---
    init() {
        chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
            if (message.action === "startReading") {
                this.startReading(message.settings)
                    .then(() => sendResponse({ success: true }))
                    .catch(error => {
                        console.error("Error starting reading:", error);
                        sendResponse({ success: false, error: error.message });
                    });
                return true; // Keep message channel open for async response
            } else if (message.action === "stopReading") {
                this.stopReading();
                sendResponse({ success: true });
            }
        });
    },

    // --- CORE ACTIONS ---
    async startReading(newSettings) {
        if (this.state.isReading) {
            console.log("Already reading. Settings updated.");
            this.settings = { ...this.settings, ...newSettings };
            return;
        }

        console.log("Starting comic reading...");
        this.settings = { ...this.settings, ...newSettings };
        this.state.isReading = true;
        this.resetState();

        await this.processComicImages();
    },

    stopReading() {
        console.log("Stopping comic reading.");
        this.state.isReading = false;
        this.resetState();
        this.tts.stop();
        this.ui.removeHighlight();
    },

    // --- LOGIC ---
    resetState() {
        this.state.textQueue = [];
        this.state.imageQueue = [];
        this.state.processedImages.clear();
        this.state.currentHighlightedImage = null;
        this.state.currentImageIndex = -1;
        this.state.currentBatchIndex = 0;
        this.state.batchResults = {};
    },

    async processComicImages() {
        // 1. Force lazy-loaded images to load
        await this.utils.forceLazyLoad();

        // 2. Find and filter images using advanced logic
        const comicImages = this.utils.findComicImages();
        if (comicImages.length === 0) {
            console.log("No valid comic images found.");
            this.tts.speak("No comic images found on this page.");
            this.stopReading();
            return;
        }

        // 3. Sort images by vertical position
        this.state.imageQueue = comicImages.sort((a, b) => {
            return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
        });
        console.log(`Found and sorted ${this.state.imageQueue.length} comic images.`);

        // 4. Process images in batches for OCR
        await this.processAllBatches();

        // 5. Start reading the first image's text
        await this.processNextImage();
    },

    async processAllBatches() {
        while (this.state.currentBatchIndex < this.state.imageQueue.length) {
            if (!this.state.isReading) return;

            const batchStart = this.state.currentBatchIndex;
            const batchEnd = Math.min(batchStart + this.settings.batchSize, this.state.imageQueue.length);
            const currentBatch = this.state.imageQueue.slice(batchStart, batchEnd);

            console.log(`Processing batch ${batchStart + 1}-${batchEnd} of ${this.state.imageQueue.length}`);

            try {
                const blobs = await Promise.all(currentBatch.map(img => this.utils.imageToBlob(img)));
                const batchText = await this.ocr.extractTextFromBatch(blobs);
                const textParts = this.utils.parseBatchText(batchText);

                textParts.forEach((text, i) => {
                    const imageIndex = batchStart + i;
                    this.state.batchResults[imageIndex] = text;
                });

            } catch (error) {
                console.error(`Error processing batch starting at index ${batchStart}:`, error);
                // Mark batch as failed so we can fall back to single OCR if needed
                for (let i = 0; i < currentBatch.length; i++) {
                     this.state.batchResults[batchStart + i] = "BATCH_OCR_FAILED";
                }
            }
            this.state.currentBatchIndex = batchEnd;
        }
    },

    async processNextImage() {
        if (!this.state.isReading) return;

        this.state.currentImageIndex++;
        if (this.state.currentImageIndex >= this.state.imageQueue.length) {
            console.log("Finished processing all images.");
            this.stopReading();
            return;
        }

        const img = this.state.imageQueue[this.state.currentImageIndex];
        this.state.processedImages.add(img.src);
        this.ui.highlightImage(img);
        img.scrollIntoView({ behavior: "smooth", block: "center" });

        try {
            let text = this.state.batchResults[this.state.currentImageIndex];

            // Fallback to single image OCR if batch failed
            if (text === "BATCH_OCR_FAILED") {
                console.warn(`Batch OCR failed for image ${this.state.currentImageIndex + 1}, falling back to single OCR.`);
                text = await this.ocr.extractTextFromImage(img);
            }

            if (text && text.trim() && text !== "No text detected in this image.") {
                console.log(`Queuing text for image ${this.state.currentImageIndex + 1}: "${text.substring(0, 50)}..."`);
                this.state.textQueue.push({ text, image: img });

                // Start speaking if not already
                if (!this.tts.isSpeaking()) {
                    this.tts.speakNextInQueue();
                }
            } else {
                console.log(`No text found for image ${this.state.currentImageIndex + 1}.`);
                // No text, move to the next image immediately
                await this.processNextImage();
            }
        } catch (error) {
            console.error(`Error processing image ${this.state.currentImageIndex + 1}:`, error);
            await this.processNextImage(); // Continue with the next image
        }
    },


    // --- OCR SERVICE ---
    ocr: {
        async extractTextFromBatch(blobs) {
            const formData = new FormData();
            blobs.forEach((blob, index) => {
                formData.append("images", blob, `image_${index}.jpg`);
            });
            const response = await this.performOcrRequest("ocr-batch", formData);
            return response.text;
        },

        async extractTextFromImage(img) {
            const blob = await ComicReader.utils.imageToBlob(img);
            const formData = new FormData();
            formData.append("image", blob, "image.jpg");
            const response = await this.performOcrRequest("ocr", formData);
            return response.text;
        },

        async performOcrRequest(endpoint, body) {
            try {
                const url = `${ComicReader.settings.backendUrl}/${endpoint}`;
                console.log(`Sending request to OCR service: ${url}`);
                const response = await fetch(url, { method: "POST", body });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.error || `Server error: ${response.status}`;
                    throw new Error(errorMessage);
                }
                return await response.json();
            } catch (error) {
                console.error(`OCR request to /${endpoint} failed:`, error);
                throw error;
            }
        },
    },

    // --- UI / DOM MANIPULATION ---
    ui: {
        highlightImage(img) {
            this.removeHighlight();
            const state = ComicReader.state;
            state.currentHighlightedImage = {
                element: img,
                originalStyle: {
                    outline: img.style.outline,
                    boxShadow: img.style.boxShadow,
                },
            };
            img.style.outline = "4px solid #4285f4";
            img.style.boxShadow = "0 0 20px rgba(66, 133, 244, 0.8)";
        },

        removeHighlight() {
            const { currentHighlightedImage } = ComicReader.state;
            if (currentHighlightedImage) {
                const { element, originalStyle } = currentHighlightedImage;
                element.style.outline = originalStyle.outline;
                element.style.boxShadow = originalStyle.boxShadow;
                ComicReader.state.currentHighlightedImage = null;
            }
        },
    },

    // --- TEXT-TO-SPEECH ---
    tts: {
        synth: window.speechSynthesis,

        speak(text) {
            if (!text || !ComicReader.state.isReading) return;

            this.stop(); // Ensure any previous speech is stopped.

            const utterance = new SpeechSynthesisUtterance(text);
            const settings = ComicReader.settings;

            const voices = this.synth.getVoices();
            if (voices.length > 0) {
                utterance.voice = voices[settings.voiceIndex] || voices[0];
            }

            utterance.rate = parseFloat(settings.rate);
            utterance.pitch = parseFloat(settings.pitch);
            utterance.volume = parseFloat(settings.volume);

            utterance.onend = () => {
                if (ComicReader.state.isReading) {
                    ComicReader.state.textQueue.shift();
                    if (ComicReader.state.textQueue.length > 0) {
                        this.speakNextInQueue();
                    } else {
                        ComicReader.processNextImage();
                    }
                }
            };

            utterance.onerror = (event) => {
                console.error("Speech synthesis error:", event.error);
                // Skip to next item in queue on error
                if (ComicReader.state.isReading) {
                    ComicReader.state.textQueue.shift();
                    ComicReader.processNextImage();
                }
            };

            console.log(`Speaking: "${text.substring(0, 50)}..."`);
            this.synth.speak(utterance);
        },

        speakNextInQueue() {
            if (ComicReader.state.textQueue.length > 0 && ComicReader.state.isReading) {
                const { text, image } = ComicReader.state.textQueue[0];
                ComicReader.ui.highlightImage(image);
                this.speak(text);
            }
        },

        stop() {
            if (this.synth.speaking) {
                this.synth.cancel();
            }
        },

        isSpeaking() {
            return this.synth.speaking;
        }
    },

    // --- UTILITIES ---
    utils: {
        async imageToBlob(img) {
            if (this.isCrossOrigin(img.src)) {
                return this.fetchImageAsBlob(img.src);
            }
            return new Promise((resolve, reject) => {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(blob => {
                    if (blob) resolve(blob);
                    else reject(new Error("Canvas to Blob conversion failed"));
                }, "image/jpeg", 0.95);
            });
        },

        isCrossOrigin(url) {
            try {
                return new URL(url).origin !== window.location.origin;
            } catch (e) {
                return true; // Assume cross-origin if URL is malformed
            }
        },

        async fetchImageAsBlob(url) {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }
            return response.blob();
        },

        parseBatchText(batchText) {
            if (!batchText) return [];
            const regex = /IMAGE \d+:\s*(.*?)(?=IMAGE \d+:|$)/gs;
            const matches = [...batchText.matchAll(regex)].map(match => match[1].trim());
            return matches.length > 0 ? matches : [batchText.trim()];
        },

        async forceLazyLoad() {
            console.log("Forcing lazy load of images...");
            const initialPosition = window.scrollY;
            const documentHeight = Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight
            );
            const scrollStep = Math.floor(window.innerHeight * 0.8);
            const waitTime = 100;

            window.scrollTo(0, documentHeight);
            await new Promise((resolve) => setTimeout(resolve, 200));

            for (let position = documentHeight; position >= 0; position -= scrollStep * 2) {
                window.scrollTo(0, position);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
            }

            const positions = [
                0,
                documentHeight / 4,
                documentHeight / 2,
                (documentHeight * 3) / 4,
                documentHeight,
            ];
            for (const position of positions) {
                window.scrollTo(0, position);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
            }

            window.scrollTo(0, initialPosition);
            console.log("Fast scrolling complete.");
        },

        findComicImages() {
            let images = [];
            const specificSelectors = [
                ".read-box img",
                ".comic-container img",
                ".manga-reader img",
                ".chapter-container img",
                ".page-container img",
                ".comic-page img",
                ".manga-page img",
                ".read-box-block img",
                ".el-image__inner",
                ".read-container img",
                ".pager-read img",
                "[data-v-6cb544df] img",
            ];

            // Try specific selectors first
            for (const selector of specificSelectors) {
                images.push(...document.querySelectorAll(selector));
            }

            // If no images found, try a more general approach
            if (images.length === 0) {
                images.push(...document.querySelectorAll("img"));
            }

            const uniqueSrcs = new Set();
            return images
                .map((img) => {
                    const imgSrc =
                        img.src ||
                        img.dataset.src ||
                        img.dataset.original ||
                        img.dataset.lazy ||
                        img.dataset.originalSrc ||
                        "";
                    if (imgSrc) {
                        img.dataset.actualSrc = imgSrc;
                    }
                    return img;
                })
                .filter((img) => {
                    const imgSrc = img.dataset.actualSrc;
                    if (!imgSrc || uniqueSrcs.has(imgSrc)) return false;

                    const style = window.getComputedStyle(img);
                    const isVisible = style.display !== "none" && style.visibility !== "hidden" && img.offsetWidth > 0 && img.offsetHeight > 0;
                    if (!isVisible) return false;

                    uniqueSrcs.add(imgSrc);
                    return true;
                });
        },
    },
};

ComicReader.init();
