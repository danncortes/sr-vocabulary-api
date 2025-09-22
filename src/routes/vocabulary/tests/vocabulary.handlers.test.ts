import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  mockVocabularyData,
  mockSupabaseResponse,
  mockSupabaseError,
} from '../../../__mocks__/vocabulary.mock.js';

// Create mock function that will be used in the module mock
const mockCreateSBClient = jest.fn();

// Mock the supabaseClient module using unstable_mockModule
jest.unstable_mockModule('../../../supabaseClient.js', () => ({
  createSBClient: mockCreateSBClient
}));

// Import the handlers after mocking
const { getAllVocabulary } = await import('../vocabulary.handlers.js');

describe('getAllVocabulary Handler', () => {
  let mockSupabase: any;
  let req: any;
  let res: any;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup mock request and response
    req = {
      token: 'mock-jwt-token' // Token is now provided by middleware
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    // Setup mock Supabase client with proper chaining
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn()
    };

    mockCreateSBClient.mockReturnValue(mockSupabase);
  });

  describe('successful requests', () => {
    it('should return vocabulary data with status 200 when request is successful', async () => {

      mockSupabase.order
        .mockReturnValueOnce(mockSupabase)  // First call: order('priority')
        .mockReturnValueOnce(mockSupabase)  // Second call: order('review_date')
        .mockResolvedValueOnce(mockSupabaseResponse); // Third call: order('id') - resolves with data

      // Act
      await getAllVocabulary(req, res);

      // Assert
      expect(mockCreateSBClient).toHaveBeenCalledWith('mock-jwt-token');
      expect(mockSupabase.from).toHaveBeenCalledWith('phrase_translations');
      expect(mockSupabase.select).toHaveBeenCalledWith(`
            id,
            sr_stage_id,
            review_date,
            priority,
            modified_at,
            learned,
            original:phrases!phrase_id (
                id,
                text,
                audio_url
            ),
            translated:phrases!translated_phrase_id (
                id,
                text,
                audio_url
            )
        `);
      expect(mockSupabase.not).toHaveBeenCalledTimes(4);
      expect(mockSupabase.order).toHaveBeenNthCalledWith(1, 'priority', { ascending: true });
      expect(mockSupabase.order).toHaveBeenNthCalledWith(2, 'review_date', { ascending: true });
      expect(mockSupabase.order).toHaveBeenNthCalledWith(3, 'id', { ascending: true });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockVocabularyData);
    });

    it('should handle database errors', async () => {
      // Arrange
      mockSupabase.order
        .mockReturnValueOnce(mockSupabase)  // First call: order('priority')
        .mockReturnValueOnce(mockSupabase)  // Second call: order('review_date')
        .mockResolvedValueOnce(mockSupabaseError);

      // Act
      await getAllVocabulary(req, res);

      // Assert
      expect(mockCreateSBClient).toHaveBeenCalledWith('mock-jwt-token');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database connection failed' });
    });
  });
});

