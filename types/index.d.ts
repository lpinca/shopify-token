declare namespace ShopifyToken {
  export interface ShopifyTokenOptions {
    // The redirect URL for the Oauth2 flow
    redirectUri: string;
    // The Shared Secret for the app
    sharedSecret: string;
    // The API Key for the app
    apiKey: string;
    // The list of scopes
    scopes?: string | string[];
    // The request timeout
    timeout?: number;
    // API access mode
    accessMode?: string;
  }
}

declare class ShopifyToken {
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
   */
  constructor(options: ShopifyToken.ShopifyTokenOptions);
  /**
   * Generate a random nonce.
   *
   * @return {String} The random nonce
   * @public
   */
  generateNonce(): string;
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
  generateAuthUrl(shop: string, scopes?: string | string[], nonce?: string, accessMode?: string): string;
  /**
   * Verify the hmac returned by Shopify.
   * The query can either be passed as a string or an object. Using a string has the advantage that order is guaranteed;
   * if you use an object, then the order is not guaranteed so the hmac may erroneously fail to be verified.
   *
   * @param {Object | string} query Either the query object, e.g. `{hmac: "fd4c", timestamp: 1337178173}`,
   * or the query string, e.g. `"hmac=fd4c&timestamp=1337178173"`
   * @return {Boolean} `true` if the hmac is valid, else `false`
   * @public
   */
  verifyHmac(query: any | string): boolean;
  /**
   * Request an access token.
   *
   * @param {String} shop The hostname of the shop, e.g. foo.myshopify.com
   * @param {String} code The authorization code
   * @return {Promise} Promise which is fulfilled with an access token and
   *     additional data
   * @public
   */
  getAccessToken(shop: string, code: string): Promise<any>;
}

export = ShopifyToken;
