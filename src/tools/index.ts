/**
 * Tools module barrel export
 */

// Types and context
export * from './types.js';
export { createToolContext, closeToolContext, type ToolContextConfig } from './context.js';

// Individual tools
export { executeKioSearch, kioSearchTool } from './kio-search.js';
export { executeKioGetJudgment, kioGetJudgmentTool } from './kio-get-judgment.js';
export { executeKioGetSourceLinks, kioGetSourceLinksTool } from './kio-get-source-links.js';
export { executeKioHealth, kioHealthTool } from './kio-health.js';

// All tools array for registration
export const allTools = [
  {
    name: 'kio_search',
    module: () => import('./kio-search.js'),
  },
  {
    name: 'kio_get_judgment',
    module: () => import('./kio-get-judgment.js'),
  },
  {
    name: 'kio_get_source_links',
    module: () => import('./kio-get-source-links.js'),
  },
  {
    name: 'kio_health',
    module: () => import('./kio-health.js'),
  },
];
