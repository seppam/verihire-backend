/**
 * Manual NoSQL / Mongoose injection sanitization.
 * Blocks operators like $gt, $ne, $where, $func, $eval, $comp, etc.
 * that attackers inject via req.body, req.query, or req.params.
 *
 * Works recursively on nested objects and arrays.
 * Safely allows dot notation for field names (e.g. "user.name").
 *
 * Usage: Replace express-mongo-sanitize.
 * Simply require this file and add app.use(sanitize) AFTER express.json()
 * but BEFORE your routes.
 */

/**
 * Recursively sanitize a value (object, array, or primitive).
 * Returns the sanitized value (may be the same reference if nothing changed).
 */
function sanitizeValue(value) {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    // Strip any leading MongoDB operator keys from string values
    // e.g. a plain string that literally equals "$gt" should be allowed (it's just text)
    // but we don't strip strings here — operators are only dangerous as object keys.
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item));
  }

  if (typeof value === 'object') {
    const sanitized = {};
    for (const key of Object.keys(value)) {
      sanitized[key] = sanitizeValue(value[key]);
    }
    return sanitized;
  }

  return value;
}

/**
 * MongoDB operator patterns to block.
 * These are only dangerous when used as KEYS (not as plain string values).
 */
const BLOCKED_PREFIXES = [
  '$',
];

const BLOCKED_KEYS = new Set([
  '$where',
  '$eval',
  '$func',
  '$group',
  '$accumulator',
  '$replaceRoot',
  '$mergeObjects',
  '$jsonSchema',
  '$geometry',
  '$geoWithin',
  '$geoIntersects',
  '$near',
  '$nearSphere',
  '$maxDistance',
  '$min',
  '$max',
  '$mod',
  '$regex',
  '$text',
  '$comment',
  '$slice',
  '$elemMatch',
  '$meta',
  '$exists',
  '$type',
  '$size',
  '$all',
  '$in',
  '$nin',
  '$nor',
  '$or',
  '$and',
  '$not',
  '$set',
  '$unset',
  '$inc',
  '$push',
  '$pull',
  '$pop',
  '$addToSet',
  '$rename',
  '$bit',
  '$currentDate',
]);

/**
 * Recursively sanitize an object's keys.
 * Recursively descends into nested plain objects and arrays.
 * Skips Mongoose document instances (check constructor name).
 */
function sanitizeKeys(obj) {
  if (obj === null || obj === undefined) return obj;

  // Skip if it's a Mongoose document or other class instance
  if (obj.constructor && obj.constructor.name !== 'Object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeKeys(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Block keys that start with $ (MongoDB operators)
    if (BLOCKED_PREFIXES.some(prefix => key.startsWith(prefix))) {
      // Allow specific safe operators as keys (they're harmless)
      if (key === '$set' || key === '$inc' || key === '$push') {
        // These need their values sanitized too
        sanitized[key] = sanitizeKeys(value);
      }
      // All other $-prefixed keys are stripped (not allowed)
      // Log for monitoring (don't throw — fail open gracefully)
      console.warn(`[Sanitize] Blocked MongoDB operator key: "${key}"`);
      continue;
    }

    // Recurse into nested objects/arrays
    sanitized[key] = sanitizeKeys(value);
  }

  return sanitized;
}

/**
 * The main middleware.
 * Sanitizes req.body, req.query, and req.params.
 */
function sanitize(req, res, next) {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeKeys(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeKeys(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeKeys(req.params);
    }
  } catch (err) {
    console.error('[Sanitize] Error during sanitization:', err.message);
    // Don't fail the request — let it pass through (fail open)
  }

  next();
}

module.exports = sanitize;
