/**
 * Tests for API configuration
 */

describe('API Configuration', () => {
  test('API_BASE_URL is defined', () => {
    const { API_BASE_URL } = require('../api');
    expect(API_BASE_URL).toBeDefined();
    expect(typeof API_BASE_URL).toBe('string');
  });

  test('API_BASE_URL is a valid URL', () => {
    const { API_BASE_URL } = require('../api');
    expect(API_BASE_URL).toMatch(/^https?:\/\//);
  });

  test('API_INFERENCE_BASE_URL is defined', () => {
    const { API_INFERENCE_BASE_URL } = require('../api');
    expect(API_INFERENCE_BASE_URL).toBeDefined();
    expect(typeof API_INFERENCE_BASE_URL).toBe('string');
  });

  test('WS_BASE_URL uses wss protocol', () => {
    const { WS_BASE_URL } = require('../api');
    expect(WS_BASE_URL).toBeDefined();
    expect(WS_BASE_URL).toMatch(/^wss?:\/\//);
  });
});
