import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  mockVocabularyData,
  mockSupabaseResponse,
  mockSupabaseError,
} from '../../../__mocks__/vocabulary.mock.js';

// Create mock function that will be used in the module mock
const mockCreateSBClient = jest.fn();

// Mock the superbaseClient module using unstable_mockModule
jest.unstable_mockModule('../../../superbaseClient.js', () => ({
  createSBClient: mockCreateSBClient
}));

// Import the handlers after mocking
const { getAllVocabulary, getVocabulary } = await import('../vocabulary.handlers.js');

describe('getAllVocabulary Handler', () => {
  let mockSupabase: any;
  let req: any;
  let res: any;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup mock request and response
    req = {
      headers: {
        authorization: 'Bearer mock-jwt-token'
      }
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

  describe('error handling', () => {
    it('should handle missing authorization header', async () => {
      // Arrange
      req.headers = {}; // No authorization header

      // Act
      await getAllVocabulary(req, res);

      // Assert
      expect(mockCreateSBClient).toHaveBeenCalledTimes(0);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle malformed authorization header', async () => {
      // Arrange
      req.headers.authorization = 'InvalidFormat';
      // Act
      await getAllVocabulary(req, res);

      // Assert
      expect(mockCreateSBClient).toHaveBeenCalledTimes(0);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle authorization header without Bearer prefix', async () => {
      // Arrange
      req.headers.authorization = 'just-a-token';

      // Act
      await getAllVocabulary(req, res);

      // Assert
      expect(mockCreateSBClient).toHaveBeenCalledTimes(0);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });
});

describe('getVocabulary Function', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    };

    mockCreateSBClient.mockReturnValue(mockSupabase);
  });

  it('should create Supabase client with provided token', () => {
    // Arrange
    const id = 123;
    const token = 'test-token';

    // Act
    getVocabulary(id, token);

    // Assert
    expect(mockCreateSBClient).toHaveBeenCalledWith(token);
  });

  it('should query phrase_translations table with correct parameters', () => {
    // Arrange
    const id = 456;
    const token = 'test-token';

    // Act
    getVocabulary(id, token);

    // Assert
    expect(mockSupabase.from).toHaveBeenCalledWith('phrase_translations');
    expect(mockSupabase.select).toHaveBeenCalledWith('*');
    expect(mockSupabase.eq).toHaveBeenCalledWith('id', id);
  });

  it('should return the Supabase query builder chain', () => {
    // Arrange
    const id = 789;
    const token = 'test-token';
    const expectedResult = mockSupabase;

    // Act
    const result = getVocabulary(id, token);

    // Assert
    expect(result).toBe(expectedResult);
  });
});