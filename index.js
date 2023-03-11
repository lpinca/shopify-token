'use strict';

const crypto = require('crypto');
const https = require('https');
const url = require('url');

/**
 * Encode a string by replacing each instance of the `&` and `%` characters
 * with `%26` and `%25` respectively.
 *
 * @param {String} input The input string
 * @return {String} The encoded string
 * @private
 */
const encodeValue = (input) => input.replace(/[%&]/g, encodeURIComponent);

/**
 * Encode a string by replacing each instance of the `&`, `%` and `=` characters
 * with `%26`, `%25` and `%3D` respectively.
 *
 * @param {String} input The input string
 * @return {String} The encoded string
 * @private
 */
const encodeKey = (input) => input.replace(/[%&=]/g, encodeURIComponent);

/**
 * Check whether two buffers have exactly the same bytes without leaking timing
 * information.
 *
 * @param {Buffer} a One buffer to be tested for equality
 * @param {Buffer} b The other buffer to be tested for equality
 * @return {Boolean} `true` if `a` and `b` have exactly the same bytes, else
 *     `false`
 * @private
 */
function timingSafeEqual(a, b) {
  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}

/**
 * ShopifyToken class.
 */
class ShopifyToken {
  /**
   * Create a ShopifyToken instance.
   *
   * @param {Object} options Configuration options
   * @param {String} options.redirectUri The redirect URL for the Oauth2 flow
   * @param {String} options.sharedSecret The Shared Secret for the app
   * @param {Array|String} [options.scopes] The list of scopes
   * @param {String} options.apiKey The API Key for the app
   * @param {String} [options.accessMode] The API access mode
   * @param {Number} [options.timeout] The request timeout
   * @param {https.Agent} [options.agent] The agent used for all HTTP requests
   */
  constructor(options) {
    if (
        !options
      || !options.sharedSecret
      || !options.redirectUri
      || !options.apiKey
    ) {
      throw new Error('Missing or invalid options');
    }

    this.accessMode = 'accessMode' in options ? options.accessMode : '';
    this.scopes = 'scopes' in options ? options.scopes : 'read_content';
    this.timeout = 'timeout' in options ? options.timeout : 60000;
    this.sharedSecret = options.sharedSecret;
    this.redirectUri = options.redirectUri;
    this.apiKey = options.apiKey;
    this.agent = options.agent;
  }

  /**
   * Generate a random nonce.
   *
   * @return {String} The random nonce
   * @public
   */
  generateNonce() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Build the authorization URL.
   *
   * @param {String} shop The shop name
   * @param {Array|String} [scopes] The list of scopes
   * @param {String} [nonce] The nonce
   * @param {String} [accessMode] The API access mode
   * @return {String} The authorization URL
   * @public
   */
  generateAuthUrl(shop, scopes, nonce, accessMode) {
    scopes || (scopes = this.scopes);
    accessMode || (accessMode = this.accessMode);

    const query = {
      scope: Array.isArray(scopes) ? scopes.join(',') : scopes,
      state: nonce || this.generateNonce(),
      redirect_uri: this.redirectUri,
      client_id: this.apiKey
    };

    if (accessMode) {
      query['grant_options[]'] = accessMode;
    }

    return url.format({
      pathname: '/admin/oauth/authorize',
      hostname: shop.endsWith('.myshopify.com') ? shop : `${shop}.myshopify.com`,
      protocol: 'https:',
      query
    });
  }

  /**
   * Verify the hmac returned by Shopify.
   *
   * @param {Object} query The parsed query string
   * @return {Boolean} `true` if the hmac is valid, else `false`
   * @public
   */
  verifyHmac(query) {
    const pairs = Object.keys(query)
      .filter((key) => key !== 'signature' && key !== 'hmac')
      .map((key) => {
        const value = Array.isArray(query[key])
          ? `["${query[key].join('", "')}"]`
          : String(query[key]);

        return `${encodeKey(key)}=${encodeValue(value)}`;
      })
      .sort();

    if (
      typeof query.hmac !== 'string' ||
      Buffer.byteLength(query.hmac) !== 64
    ) {
      return false;
    }

    const digest = crypto.createHmac('sha256', this.sharedSecret)
      .update(pairs.join('&'))
      .digest();

    return timingSafeEqual(digest, Buffer.from(query.hmac, 'hex'));
  }

  /**
   * Request an access token.
   *
   * @param {String} shop The hostname of the shop, e.g. foo.myshopify.com
   * @param {String} code The authorization code
   * @return {Promise} Promise which is fulfilled with an access token and
   *     additional data
   * @public
   */
  getAccessToken(shop, code) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        client_secret: this.sharedSecret,
        client_id: this.apiKey,
        code
      });

      const request = https.request({
        headers: {
          'Content-Length': Buffer.byteLength(data),
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        path: '/admin/oauth/access_token',
        hostname: shop,
        method: 'POST',
        agent: this.agent
      });

      let timer = setTimeout(() => {
        request.abort();
        timer = null;
        reject(new Error('Request timed out'));
      }, this.timeout);

      request.on('response', (response) => {
        const status = response.statusCode;
        let body = '';

        response.setEncoding('utf8');
        response.on('data', (chunk) => body += chunk);
        response.on('end', () => {
          let error;

          if (!timer) return;

          clearTimeout(timer);

          if (status !== 200) {
            error = new Error('Failed to get Shopify access token');
            error.responseBody = body;
            error.statusCode = status;
            return reject(error);
          }

          try {
            body = JSON.parse(body);
          } catch (e) {
            error = new Error('Failed to parse the response body');
            error.responseBody = body;
            error.statusCode = status;
            return reject(error);
          }

          resolve(body);
        });
      });

      request.on('error', (err) => {
        if (!timer) return;

        clearTimeout(timer);
        reject(err);
      });

      request.end(data);
    });
  }
}

module.exports = ShopifyToken;
