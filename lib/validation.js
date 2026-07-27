/**
 * Input Validation Utilities for nervix-cli
 *
 * Provides validation functions for user inputs to prevent injection,
 * ensure data integrity, and provide clear error messages.
 *
 * @module lib/validation
 */

/**
 * Validates agent ID format
 * @param {string} agentId - Agent ID to validate
 * @returns {boolean} True if valid
 */
export function isValidAgentId(agentId) {
  if (!agentId || typeof agentId !== 'string') return false;
  return /^[a-zA-Z0-9_-]{3,64}$/.test(agentId);
}

/**
 * Validates task ID format
 * @param {string} taskId - Task ID to validate
 * @returns {boolean} True if valid
 */
export function isValidTaskId(taskId) {
  if (!taskId || typeof taskId !== 'string') return false;
  return /^[a-zA-Z0-9_-]{8,64}$/.test(taskId);
}

/**
 * Validates message ID format
 * @param {string} messageId - Message ID to validate
 * @returns {boolean} True if valid
 */
export function isValidMessageId(messageId) {
  if (!messageId || typeof messageId !== 'string') return false;
  return /^[a-zA-Z0-9_-]{8,64}$/.test(messageId);
}

/**
 * Validates escrow ID format
 * @param {string} escrowId - Escrow ID to validate
 * @returns {boolean} True if valid
 */
export function isValidEscrowId(escrowId) {
  if (!escrowId || typeof escrowId !== 'string') return false;
  return /^[a-zA-Z0-9_-]{8,64}$/.test(escrowId);
}

/**
 * Validates rating (1-5 stars)
 * @param {string|number} rating - Rating to validate
 * @returns {number|null} Validated rating or null
 */
export function validateRating(rating) {
  const normalized = typeof rating === 'string' ? rating.trim() : rating;
  const numRating = Number(normalized);
  if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    return null;
  }
  return numRating;
}

/**
 * Validates credit amount
 * @param {string|number} amount - Amount to validate
 * @returns {number|null} Validated amount or null
 */
export function validateAmount(amount) {
  const normalized = typeof amount === 'string' ? amount.trim() : String(amount);
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;

  const numAmount = Number(normalized);
  if (!Number.isFinite(numAmount) || numAmount <= 0 || numAmount > Number.MAX_SAFE_INTEGER) {
    return null;
  }
  return numAmount;
}

/**
 * Sanitizes message content (basic XSS prevention)
 * @param {string} content - Content to sanitize
 * @returns {string} Sanitized content
 */
export function sanitizeMessage(content) {
  if (!content || typeof content !== 'string') return '';

  // Remove potential XSS vectors
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
    .substring(0, 10000); // Max 10k characters
}

/**
 * Validates timeout value (in minutes)
 * @param {string|number} timeout - Timeout to validate
 * @returns {number|null} Validated timeout in seconds or null
 */
export function validateTimeout(timeout) {
  const normalized = typeof timeout === 'string' ? timeout.trim() : timeout;
  const numTimeout = Number(normalized);
  if (!Number.isInteger(numTimeout) || numTimeout <= 0) return null;
  if (numTimeout > 10080) return null; // Max 7 days
  return numTimeout * 60; // Convert to seconds
}

/**
 * Validates priority level
 * @param {string} priority - Priority to validate
 * @returns {boolean} True if valid
 */
export function isValidPriority(priority) {
  const validPriorities = ['low', 'normal', 'high', 'urgent'];
  return validPriorities.includes(priority);
}

/**
 * Validates and sanitizes tags list
 * @param {string} tagsString - Comma-separated tags
 * @returns {string[]} Sanitized tags array
 */
export function validateTags(tagsString) {
  if (!tagsString || typeof tagsString !== 'string') return [];

  return tagsString
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length > 0 && tag.length <= 50 && /^[a-z0-9_]+$/.test(tag))
    .slice(0, 10); // Max 10 tags
}

/**
 * Validates agent name format
 * @param {string} name - Name to validate
 * @returns {boolean} True if valid
 */
export function isValidAgentName(name) {
  if (!name || typeof name !== 'string') return false;
  return /^[a-zA-Z0-9_-]{3,32}$/.test(name);
}

/**
 * Sanitizes description text
 * @param {string} description - Description to sanitize
 * @returns {string} Sanitized description
 */
export function sanitizeDescription(description) {
  if (!description || typeof description !== 'string') return '';

  return description
    .replace(/[<>]/g, '') // Basic XSS prevention
    .trim()
    .substring(0, 500); // Max 500 characters
}

/**
 * Validates and sanitizes role list
 * @param {string} rolesString - Comma-separated roles
 * @returns {string[]} Validated roles
 */
export function validateRoles(rolesString) {
  if (!rolesString || typeof rolesString !== 'string') return [];

  const validRoles = [
    'coder', 'orchestrator', 'qa', 'security', 'data',
    'deploy', 'devops', 'monitor', 'research', 'docs'
  ];

  return rolesString
    .split(',')
    .map(role => role.trim().toLowerCase())
    .filter(role => validRoles.includes(role))
    .slice(0, 5); // Max 5 roles
}

/**
 * Validates URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validates hex string (for addresses, keys, etc.)
 * @param {string} hex - Hex string to validate
 * @param {number} length - Expected length (optional)
 * @returns {boolean} True if valid
 */
export function isValidHex(hex, length) {
  if (!hex || typeof hex !== 'string') return false;
  if (!/^[0-9a-fA-F]+$/.test(hex)) return false;
  if (length && hex.length !== length) return false;
  return true;
}

/**
 * Creates a validation error message
 * @param {string} field - Field name
 * @param {string} expected - Expected format
 * @returns {string} Error message
 */
export function validationError(field, expected) {
  return `Invalid ${field}. Expected: ${expected}`;
}
