import { describe, it, expect } from 'vitest';
import {
  DomainAllowlist,
  createAllowlist,
  createDefaultAllowlist,
  DEFAULT_ALLOWED_DOMAINS,
} from '../../../src/security/allowlist.js';
import { DomainNotAllowedError } from '../../../src/utils/errors.js';

describe('DomainAllowlist', () => {
  describe('checkUrl', () => {
    it('should allow URLs from allowed domains', () => {
      const allowlist = new DomainAllowlist({
        domains: ['example.com', 'test.org'],
      });

      expect(() => allowlist.checkUrl('https://example.com/path')).not.toThrow();
      expect(() => allowlist.checkUrl('https://test.org/page')).not.toThrow();
    });

    it('should throw for disallowed domains', () => {
      const allowlist = new DomainAllowlist({ domains: ['example.com'] });

      expect(() => allowlist.checkUrl('https://malicious.com/path')).toThrow(
        DomainNotAllowedError
      );
    });

    it('should allow subdomains by default', () => {
      const allowlist = new DomainAllowlist({ domains: ['example.com'] });

      expect(() =>
        allowlist.checkUrl('https://sub.example.com/path')
      ).not.toThrow();
      expect(() =>
        allowlist.checkUrl('https://deep.sub.example.com/path')
      ).not.toThrow();
    });

    it('should reject subdomains when disabled', () => {
      const allowlist = new DomainAllowlist({
        domains: ['example.com'],
        allowSubdomains: false,
      });

      expect(() =>
        allowlist.checkUrl('https://sub.example.com/path')
      ).toThrow(DomainNotAllowedError);
    });

    it('should handle case insensitively', () => {
      const allowlist = new DomainAllowlist({ domains: ['Example.COM'] });

      expect(() =>
        allowlist.checkUrl('https://EXAMPLE.com/path')
      ).not.toThrow();
    });

    it('should throw for invalid URLs', () => {
      const allowlist = new DomainAllowlist({ domains: ['example.com'] });

      expect(() => allowlist.checkUrl('not-a-url')).toThrow(
        DomainNotAllowedError
      );
    });
  });

  describe('isAllowed', () => {
    it('should return true for allowed domains', () => {
      const allowlist = new DomainAllowlist({ domains: ['example.com'] });

      expect(allowlist.isAllowed('https://example.com/path')).toBe(true);
    });

    it('should return false for disallowed domains', () => {
      const allowlist = new DomainAllowlist({ domains: ['example.com'] });

      expect(allowlist.isAllowed('https://other.com/path')).toBe(false);
    });

    it('should return false for invalid URLs', () => {
      const allowlist = new DomainAllowlist({ domains: ['example.com'] });

      expect(allowlist.isAllowed('not-a-url')).toBe(false);
    });
  });

  describe('addDomain', () => {
    it('should add new domain to allowlist', () => {
      const allowlist = new DomainAllowlist({ domains: ['example.com'] });

      allowlist.addDomain('new.org');

      expect(allowlist.isAllowed('https://new.org/path')).toBe(true);
    });
  });

  describe('removeDomain', () => {
    it('should remove domain from allowlist', () => {
      const allowlist = new DomainAllowlist({
        domains: ['example.com', 'other.org'],
      });

      const removed = allowlist.removeDomain('example.com');

      expect(removed).toBe(true);
      expect(allowlist.isAllowed('https://example.com/path')).toBe(false);
    });

    it('should return false for non-existent domain', () => {
      const allowlist = new DomainAllowlist({ domains: ['example.com'] });

      expect(allowlist.removeDomain('other.org')).toBe(false);
    });
  });

  describe('getAllowedDomains', () => {
    it('should return list of allowed domains', () => {
      const allowlist = new DomainAllowlist({
        domains: ['example.com', 'test.org'],
      });

      const domains = allowlist.getAllowedDomains();

      expect(domains).toContain('example.com');
      expect(domains).toContain('test.org');
    });
  });

  describe('hasDomain', () => {
    it('should return true for existing domain', () => {
      const allowlist = new DomainAllowlist({ domains: ['example.com'] });

      expect(allowlist.hasDomain('example.com')).toBe(true);
    });

    it('should return false for non-existent domain', () => {
      const allowlist = new DomainAllowlist({ domains: ['example.com'] });

      expect(allowlist.hasDomain('other.org')).toBe(false);
    });
  });
});

describe('DEFAULT_ALLOWED_DOMAINS', () => {
  it('should include SAOS domains', () => {
    expect(DEFAULT_ALLOWED_DOMAINS).toContain('saos.org.pl');
    expect(DEFAULT_ALLOWED_DOMAINS).toContain('www.saos.org.pl');
  });

  it('should include UZP domains', () => {
    expect(DEFAULT_ALLOWED_DOMAINS).toContain('uzp.gov.pl');
    expect(DEFAULT_ALLOWED_DOMAINS).toContain('www.uzp.gov.pl');
    expect(DEFAULT_ALLOWED_DOMAINS).toContain('orzeczenia.uzp.gov.pl');
  });
});

describe('createAllowlist', () => {
  it('should create allowlist with custom domains', () => {
    const allowlist = createAllowlist({ domains: ['custom.com'] });

    expect(allowlist.isAllowed('https://custom.com/path')).toBe(true);
    expect(allowlist.isAllowed('https://other.com/path')).toBe(false);
  });
});

describe('createDefaultAllowlist', () => {
  it('should create allowlist with default KIO domains', () => {
    const allowlist = createDefaultAllowlist();

    expect(allowlist.isAllowed('https://saos.org.pl/api')).toBe(true);
    expect(allowlist.isAllowed('https://orzeczenia.uzp.gov.pl/kio')).toBe(true);
    expect(allowlist.isAllowed('https://malicious.com')).toBe(false);
  });
});
