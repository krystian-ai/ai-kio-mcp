/**
 * Domain allowlist for security
 * Restricts external requests to approved domains only
 */

import { DomainNotAllowedError } from '../utils/errors.js';

/**
 * Default allowed domains for KIO data sources
 */
export const DEFAULT_ALLOWED_DOMAINS = [
  'saos.org.pl',
  'www.saos.org.pl',
  'uzp.gov.pl',
  'www.uzp.gov.pl',
  'orzeczenia.uzp.gov.pl',
] as const;

/**
 * Domain allowlist configuration
 */
export interface AllowlistConfig {
  /** Allowed domains */
  domains: readonly string[];
  /** Allow subdomains of listed domains */
  allowSubdomains?: boolean;
}

/**
 * Domain allowlist for restricting external requests
 */
export class DomainAllowlist {
  private readonly domains: Set<string>;
  private readonly allowSubdomains: boolean;

  constructor(config: AllowlistConfig = { domains: DEFAULT_ALLOWED_DOMAINS }) {
    this.domains = new Set(config.domains.map((d) => d.toLowerCase()));
    this.allowSubdomains = config.allowSubdomains ?? true;
  }

  /**
   * Extract hostname from URL
   */
  private extractHostname(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname.toLowerCase();
    } catch {
      throw new DomainNotAllowedError(url);
    }
  }

  /**
   * Check if a domain matches an allowed domain
   */
  private matchesDomain(hostname: string, allowedDomain: string): boolean {
    if (hostname === allowedDomain) {
      return true;
    }

    if (this.allowSubdomains) {
      // Check if hostname is a subdomain of the allowed domain
      return hostname.endsWith(`.${allowedDomain}`);
    }

    return false;
  }

  /**
   * Check if a URL's domain is allowed
   * @throws DomainNotAllowedError if domain is not in allowlist
   */
  checkUrl(url: string): boolean {
    const hostname = this.extractHostname(url);

    for (const domain of this.domains) {
      if (this.matchesDomain(hostname, domain)) {
        return true;
      }
    }

    throw new DomainNotAllowedError(hostname);
  }

  /**
   * Check if a URL is allowed (non-throwing version)
   */
  isAllowed(url: string): boolean {
    try {
      return this.checkUrl(url);
    } catch {
      return false;
    }
  }

  /**
   * Add a domain to the allowlist
   */
  addDomain(domain: string): void {
    this.domains.add(domain.toLowerCase());
  }

  /**
   * Remove a domain from the allowlist
   */
  removeDomain(domain: string): boolean {
    return this.domains.delete(domain.toLowerCase());
  }

  /**
   * Get all allowed domains
   */
  getAllowedDomains(): string[] {
    return Array.from(this.domains);
  }

  /**
   * Check if a domain is in the allowlist (direct match)
   */
  hasDomain(domain: string): boolean {
    return this.domains.has(domain.toLowerCase());
  }
}

/**
 * Create a domain allowlist instance
 */
export function createAllowlist(config?: AllowlistConfig): DomainAllowlist {
  return new DomainAllowlist(config);
}

/**
 * Create the default allowlist for KIO sources
 */
export function createDefaultAllowlist(): DomainAllowlist {
  return new DomainAllowlist({ domains: DEFAULT_ALLOWED_DOMAINS });
}
