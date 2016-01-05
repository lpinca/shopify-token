# shopify-token

[![Version npm][npm-shopify-token-badge]][npm-shopify-token]
[![Build Status][travis-shopify-token-badge]][travis-shopify-token]
[![Coverage Status][coverage-shopify-token-badge]][coverage-shopify-token]

This module helps you retrieve an access token for the Shopify REST API. It
provides some convenience methods that can be used when implementing the
[OAuth 2.0 flow][shopify-oauth-doc]. No assumptions are made about your
server-side architecture, allowing the module to easily adapt to any setup.

## Install

```
npm install --save shopify-token
```

## API

The module exports a constructor function which takes an options object:

```js
var ShopifyToken = require('shopify-token');

var shopifyToken = new ShopifyToken({
  sharedSecret: '8ceb18e8ca581aee7cad1ddd3991610b',
  redirectUri: 'http://localhost:8080/callback',
  apiKey: 'e74d25b9a6f2b15f2836c954ea8c1711'
});
```

### ShopifyToken(options)

Returns a new ShopifyToken instance. Throws an erros if the required options
are missing.

**Arguments**

- `options` - A plain JavaScript objet e.g. `{ apiKey: 'YOUR_API_KEY' }`.

**Options**

- `apiKey` - Required - A string that specifies the API key of your app.
- `sharedSecret` - Required - A string that specifies the shared secret of your
  app.
- `redirectUri` - Required - A string that specifies the URL where you want to
  redirect the users after they authorize the app.
- `scopes` - Optional - An array of strings or a comma-separated string that
  specifies the list of scopes e.g. `'read_content,read_themes'`. Defaults to
  `'read_content'`.

### shopifyToken.generateAuthUrl(shop[, scopes]);

Builds and returns the authorization URL where you should redirect the user.

**Arguments**

- `shop` - A string that specifies the name of the user's shop.
- `scopes` - An optional array of strings or comma-separated string to specify
  the list of scopes. This allows you to override the default scopes.

### shopifyToken.verifyHmac(query);

Every request or redirect from Shopify to the client server includes a hmac
parameter that can be used to ensure that it came from Shopify. This method
validates the hmac parameter and returns `true` or `false` accordingly.

**Arguments**

- `query` - The parsed query string object.

### shopifyToken.getAccessToken(hostname, code, fn)

Exchanges the authorization code for a permanent access token.

**Arguments**

- `hostname` - A string that specifies the hostname of the user's shop.
  e.g. `foo.myshopify.com`. You can get this from the `shop` parameter passed
  by Shopify in the confirmation redirect.
- `code` - The authorization Code. You can get this from the `code` parameter
  passed by Shopify in the confirmation redirect.
- `fn(err, token)` - An error-first callback function which is called when the
  token has been exchanged or an error occurs.

## Usage

The example folder contains an example of how you can use this module with
Express.

## License

[MIT](LICENSE)

[npm-shopify-token-badge]: https://img.shields.io/npm/v/shopify-token.svg
[npm-shopify-token]: https://www.npmjs.com/package/shopify-token
[travis-shopify-token-badge]: https://img.shields.io/travis/lpinca/shopify-token/master.svg
[travis-shopify-token]: https://travis-ci.org/lpinca/shopify-token
[coverage-shopify-token-badge]: https://img.shields.io/coveralls/lpinca/shopify-token/master.svg
[coverage-shopify-token]: https://coveralls.io/r/lpinca/shopify-token?branch=master
[shopify-oauth-doc]: https://docs.shopify.com/api/authentication/oauth
