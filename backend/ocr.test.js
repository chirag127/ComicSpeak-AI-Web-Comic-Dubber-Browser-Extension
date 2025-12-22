const request = require('supertest');
const app = require('./ocr');
const { OpenAI } = require('openai');

jest.mock('openai');

describe('OCR Backend', () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    OpenAI.mockClear();
  });

  describe('GET /health', () => {
    it('should respond with a 200 status code and a success message', async () => {
      const response = await request(app).get('/health');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ status: 'ok', message: 'Server is healthy.' });
    });
  });

  describe('POST /ocr', () => {
    it('should respond with a 400 status code if no image is provided', async () => {
      const response = await request(app).post('/ocr');
      expect(response.statusCode).toBe(400);
      expect(response.body).toEqual({ error: 'No image file was provided.' });
    });

    it('should respond with extracted text if an image is provided', async () => {
      const mockCompletion = {
        choices: [
          {
            message: {
              content: 'This is a test.',
            },
          },
        ],
      };
      OpenAI.prototype.chat = {
        completions: {
          create: jest.fn().mockResolvedValue(mockCompletion),
        },
      };

      const response = await request(app)
        .post('/ocr')
        .attach('image', Buffer.from('test'), 'test.jpg');

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ text: 'This is a test.' });
    });
  });
});
