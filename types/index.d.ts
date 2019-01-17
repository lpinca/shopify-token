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
    access_mode?: string;
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
   * @param {String} options.access_mode The API access mode
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
   * @param {String} [access_mode] The API access_mode
   * @return {String} The authorization URL
   * @public
   */
  generateAuthUrl(shop: string, scopes?: string | string[], nonce?: string, access_mode?: string): string;
  /**
   * Verify the hmac returned by Shopify.
   *
   * @param {Object} query The query string object
   * @return {Boolean} `true` if the hmac is valid, else `false`
   * @public
   */
  verifyHmac(query: any): boolean;
  /**
   * Request an access token.
   *
   * @param {String} shop The hostname of the shop, e.g. foo.myshopify.com
   * @param {String} code The authorization code
   * @return {Promise} Promise which is fulfilled with the token data object
   * @public
   */
  getAccessToken(shop: string, code: string): Promise<object>;
}

export = ShopifyToken;
