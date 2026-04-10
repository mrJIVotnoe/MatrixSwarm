import { describe, it, expect } from 'vitest';
import { calculateInitialTrustScore, formatNodeId, determineAiTier } from './utils';

describe('Utility Functions', () => {
  describe('calculateInitialTrustScore', () => {
    it('should return 50 for low-end hardware', () => {
      expect(calculateInitialTrustScore({ cores: 2, memory: 2 })).toBe(50);
    });

    it('should return 60 for mid-range hardware (cores > 4)', () => {
      expect(calculateInitialTrustScore({ cores: 8, memory: 2 })).toBe(60);
    });

    it('should return 70 for high-end hardware', () => {
      expect(calculateInitialTrustScore({ cores: 8, memory: 8 })).toBe(70);
    });
  });

  describe('formatNodeId', () => {
    it('should format a long ID to 8 uppercase characters', () => {
      expect(formatNodeId('tma_node_1234567890')).toBe('TMA_NODE');
    });

    it('should return unknown for empty ID', () => {
      expect(formatNodeId('')).toBe('unknown');
    });
  });

  describe('determineAiTier', () => {
    it('should return llm for >= 8GB RAM', () => {
      expect(determineAiTier(8192)).toBe('llm');
    });

    it('should return slm_3b for >= 4GB RAM', () => {
      expect(determineAiTier(4096)).toBe('slm_3b');
    });

    it('should return none for < 2GB RAM', () => {
      expect(determineAiTier(1024)).toBe('none');
    });
  });
});
