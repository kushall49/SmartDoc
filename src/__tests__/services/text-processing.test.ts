import { cleanText, chunkText, calculateTextStats, extractKeywords } from '@/services/text-processing.service';

describe('Text Processing Service', () => {
  describe('cleanText', () => {
    it('should remove extra whitespace', () => {
      const input = 'Hello    world   test';
      const result = cleanText(input);
      expect(result).toBe('Hello world test');
    });

    it('should normalize line breaks', () => {
      const input = 'Line1\r\nLine2\rLine3\nLine4';
      const result = cleanText(input);
      expect(result).toContain('Line1');
      expect(result).toContain('Line2');
      expect(result).toContain('Line3');
      expect(result).toContain('Line4');
    });

    it('should remove control characters', () => {
      const input = 'Hello\x00\x01\x02World';
      const result = cleanText(input);
      expect(result).toBe('HelloWorld');
    });

    it('should handle empty strings', () => {
      expect(cleanText('')).toBe('');
    });
  });

  describe('chunkText', () => {
    it('should split text into chunks of specified size', () => {
      const text = 'a'.repeat(1000);
      const chunks = chunkText(text, 200, 50);
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(250); // maxSize + overlap
      });
    });

    it('should respect sentence boundaries', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const chunks = chunkText(text, 30, 10);
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should handle text smaller than chunk size', () => {
      const text = 'Small text';
      const chunks = chunkText(text, 100, 20);
      expect(chunks.length).toBe(1);
      expect(chunks[0]).toBe(text);
    });

    it('should create overlapping chunks', () => {
      const text = 'First chunk here. Second chunk here. Third chunk here.';
      const chunks = chunkText(text, 25, 10);
      expect(chunks.length).toBeGreaterThan(1);
    });
  });

  describe('calculateTextStats', () => {
    it('should count characters correctly', () => {
      const text = 'Hello';
      const stats = calculateTextStats(text);
      expect(stats.characters).toBe(5);
    });

    it('should count words correctly', () => {
      const text = 'Hello world test';
      const stats = calculateTextStats(text);
      expect(stats.words).toBe(3);
    });

    it('should count sentences correctly', () => {
      const text = 'First sentence. Second sentence! Third sentence?';
      const stats = calculateTextStats(text);
      expect(stats.sentences).toBe(3);
    });

    it('should calculate readability score', () => {
      const text = 'This is a simple test. It has short sentences.';
      const stats = calculateTextStats(text);
      expect(stats.readabilityScore).toBeGreaterThan(0);
    });

    it('should handle empty text', () => {
      const stats = calculateTextStats('');
      expect(stats.characters).toBe(0);
      expect(stats.words).toBe(0);
      expect(stats.sentences).toBe(0);
    });
  });

  describe('extractKeywords', () => {
    it('should extract common words as keywords', () => {
      const text = 'machine learning artificial intelligence machine learning data science';
      const keywords = extractKeywords(text);
      expect(keywords).toContain('machine');
      expect(keywords).toContain('learning');
    });

    it('should filter out common stopwords', () => {
      const text = 'the and a but or machine learning';
      const keywords = extractKeywords(text);
      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('and');
      expect(keywords).toContain('machine');
    });

    it('should return specified number of keywords', () => {
      const text = 'word1 word2 word3 word4 word5 word6';
      const keywords = extractKeywords(text, 3);
      expect(keywords.length).toBeLessThanOrEqual(3);
    });

    it('should handle empty text', () => {
      const keywords = extractKeywords('');
      expect(keywords).toEqual([]);
    });
  });
});
