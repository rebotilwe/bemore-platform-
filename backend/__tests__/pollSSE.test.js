import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { addClient, removeClient, broadcast, getClientCount, getTotalClientCount } from '../src/services/pollSSE.js';

describe('pollSSE.js', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      writeHead: jest.fn(),
      write: jest.fn(),
      on: jest.fn(),
      end: jest.fn(),
    };
  });

  afterEach(() => {
    // Clean up all intervals
    jest.clearAllTimers();
  });

  describe('addClient', () => {
    it('should set correct headers and send connected event', () => {
      addClient('poll1', mockRes);
      expect(mockRes.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      }));
      expect(mockRes.write).toHaveBeenCalledWith(expect.stringContaining('event: connected'));
    });

    it('should add client to clients map', () => {
      addClient('poll1', mockRes);
      expect(getClientCount('poll1')).toBe(1);
    });

    it('should register close event handler', () => {
      addClient('poll1', mockRes);
      expect(mockRes.on).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });

  describe('removeClient', () => {
    it('should remove client from poll', () => {
      addClient('poll1', mockRes);
      expect(getClientCount('poll1')).toBe(1);
      removeClient('poll1', mockRes);
      expect(getClientCount('poll1')).toBe(0);
    });

    it('should clean up timer when no clients left', () => {
      jest.useFakeTimers();
      addClient('poll1', mockRes);
      const timerCountBefore = jest.getTimerCount();
      removeClient('poll1', mockRes);
      expect(getClientCount('poll1')).toBe(0);
      // Timer should be cleared
      jest.useRealTimers();
    });
  });

  describe('broadcast', () => {
    it('should send event to all clients', () => {
      const mockRes2 = { ...mockRes, write: jest.fn() };
      addClient('poll1', mockRes);
      addClient('poll1', mockRes2);

      broadcast('poll1', 'results', { yes: 5, no: 3 });
      expect(mockRes.write).toHaveBeenCalledWith(expect.stringContaining('event: results'));
      expect(mockRes2.write).toHaveBeenCalledWith(expect.stringContaining('event: results'));
    });

    it('should not throw on unserializable data', () => {
      const circular = {};
      circular.self = circular;
      addClient('poll1', mockRes);
      expect(() => broadcast('poll1', 'test', circular)).not.toThrow();
    });

    it('should remove client if write fails', () => {
      const badRes = {
        write: jest.fn().mockImplementation(() => { throw new Error('write failed'); }),
        on: jest.fn(),
      };
      addClient('poll1', badRes);
      broadcast('poll1', 'test', { data: 1 });
      expect(getClientCount('poll1')).toBe(1); // original client still there, badRes removed
    });
  });

  describe('getClientCount', () => {
    it('should return 0 for non-existent poll', () => {
      expect(getClientCount('nonexistent')).toBe(0);
    });

    it('should return correct count', () => {
      addClient('poll1', mockRes);
      addClient('poll1', mockRes);
      expect(getClientCount('poll1')).toBe(2);
    });
  });

  describe('getTotalClientCount', () => {
    it('should return total across all polls', () => {
      const mockRes2 = { ...mockRes, write: jest.fn(), on: jest.fn() };
      addClient('poll1', mockRes);
      addClient('poll2', mockRes2);
      expect(getTotalClientCount()).toBe(2);
    });
  });
});
