import { jest } from '@jest/globals';

export const mockVocabularyData = [
  {
    id: 1,
    sr_stage_id: 1,
    review_date: '2024-01-15',
    priority: 1,
    modified_at: '2024-01-10T10:00:00Z',
    learned: 0,
    original: {
      id: 101,
      text: 'Hello',
      audio_url: 'https://example.com/audio/hello.mp3'
    },
    translated: {
      id: 201,
      text: 'Hola',
      audio_url: 'https://example.com/audio/hola.mp3'
    }
  },
  {
    id: 2,
    sr_stage_id: 2,
    review_date: '2024-01-16',
    priority: 2,
    modified_at: '2024-01-11T11:00:00Z',
    learned: 1,
    original: {
      id: 102,
      text: 'Goodbye',
      audio_url: 'https://example.com/audio/goodbye.mp3'
    },
    translated: {
      id: 202,
      text: 'Adiós',
      audio_url: 'https://example.com/audio/adios.mp3'
    }
  },
  {
    id: 3,
    sr_stage_id: 1,
    review_date: '2024-01-14',
    priority: 3,
    modified_at: '2024-01-09T09:00:00Z',
    learned: 0,
    original: {
      id: 103,
      text: 'Thank you',
      audio_url: 'https://example.com/audio/thankyou.mp3'
    },
    translated: {
      id: 203,
      text: 'Gracias',
      audio_url: 'https://example.com/audio/gracias.mp3'
    }
  }
];

export const mockSupabaseResponse = {
  data: mockVocabularyData,
  error: null
};

export const mockSupabaseError = {
  data: null,
  error: { message: 'Database connection failed' }
};

export const mockRequest = {
  headers: {
    authorization: 'Bearer mock-jwt-token'
  }
};

export const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};