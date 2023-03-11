describe('shopify-token', function () {
  'use strict';

  const expect = require('chai').expect;
  const stream = require('stream');
  const https = require('https');
  const nock = require('nock');
  const url = require('url');

  const ShopifyToken = require('.');

  const shopifyToken = new ShopifyToken({
    sharedSecret: 'foo',
    redirectUri: 'bar',
    apiKey: 'baz'
  });

  it('exports the class', function () {
    expect(ShopifyToken).to.be.a('function');
  });

  it('throws an error when the required options are missing', function () {
    expect(() => {
      new ShopifyToken();
    }).to.throw(Error, /Missing or invalid options/);

    expect(() => {
      new ShopifyToken({ scopes: 'write_content' });
    }).to.throw(Error, /Missing or invalid options/);
  });

  it('uses a default scope', function () {
    expect(shopifyToken.scopes).to.equal('read_content');
  });

  it('defaults to offline access mode', function () {
    expect(shopifyToken.accessMode).to.equal('');
  });

  it('allows to customize the default scopes', function () {
    const shopifyToken = new ShopifyToken({
      scopes: 'read_content,write_content',
      sharedSecret: 'foo',
      redirectUri: 'bar',
      apiKey: 'baz'
    });

    expect(shopifyToken.scopes).to.equal('read_content,write_content');
  });

  it('allows to customize the default access mode', function () {
    const shopifyToken = new ShopifyToken({
      accessMode: 'per-user',
      sharedSecret: 'foo',
      redirectUri: 'bar',
      apiKey: 'baz'
    });

    expect(shopifyToken.accessMode).to.equal('per-user');
  });

  it('allows to customize the request timeout', function () {
    const shopifyToken = new ShopifyToken({
      sharedSecret: 'foo',
      redirectUri: 'bar',
      apiKey: 'baz',
      timeout: 300
    });

    expect(shopifyToken.timeout).to.equal(300);
  });

  describe('#generateNonce', function () {
    it('generates a random nonce', function () {
      const nonce = shopifyToken.generateNonce();

      expect(nonce).to.be.a('string').and.have.length(32);
    });
  });

  describe('#generateAuthUrl', function () {
    it('builds the authorization URL', function () {
      const uri = shopifyToken.generateAuthUrl('qux');
      const nonce = url.parse(uri, true).query.state;

      expect(nonce).to.be.a('string').and.have.length(32);
      expect(uri).to.equal(url.format({
        pathname: '/admin/oauth/authorize',
        hostname: 'qux.myshopify.com',
        protocol: 'https:',
        query: {
          scope: 'read_content',
          state: nonce,
          redirect_uri: 'bar',
          client_id: 'baz'
        }
      }));
    });

    it("allows to use the shop's myshopify.com domain as shop name", function () {
      const uri = shopifyToken.generateAuthUrl('qux.myshopify.com');
      const nonce = url.parse(uri, true).query.state;

      expect(nonce).to.be.a('string').and.have.length(32);
      expect(uri).to.equal(url.format({
        pathname: '/admin/oauth/authorize',
        hostname: 'qux.myshopify.com',
        protocol: 'https:',
        query: {
          scope: 'read_content',
          state: nonce,
          redirect_uri: 'bar',
          client_id: 'baz'
        }
      }));
    });

    it('allows to override the default scopes', function () {
      const uri = shopifyToken.generateAuthUrl('qux', 'read_themes,read_products');
      const nonce = url.parse(uri, true).query.state;

      expect(nonce).to.be.a('string').and.have.length(32);
      expect(uri).to.equal(url.format({
        pathname: '/admin/oauth/authorize',
        hostname: 'qux.myshopify.com',
        protocol: 'https:',
        query: {
          scope: 'read_themes,read_products',
          state: nonce,
          redirect_uri: 'bar',
          client_id: 'baz'
        }
      }));
    });

    it('allows to use an array to override the scopes', function () {
      const uri = shopifyToken.generateAuthUrl('qux', [
        'read_products',
        'read_themes'
      ]);
      const nonce = url.parse(uri, true).query.state;

      expect(nonce).to.be.a('string').and.have.length(32);
      expect(uri).to.equal(url.format({
        pathname: '/admin/oauth/authorize',
        hostname: 'qux.myshopify.com',
        protocol: 'https:',
        query: {
          scope: 'read_products,read_themes',
          state: nonce,
          redirect_uri: 'bar',
          client_id: 'baz'
        }
      }));
    });

    it('allows to use a custom nonce', function () {
      const uri = shopifyToken.generateAuthUrl('qux', undefined, 'corge');

      expect(uri).to.equal(url.format({
        pathname: '/admin/oauth/authorize',
        hostname: 'qux.myshopify.com',
        protocol: 'https:',
        query: {
          scope: 'read_content',
          state: 'corge',
          redirect_uri: 'bar',
          client_id: 'baz'
        }
      }));
    });

    it('allows to override the default access mode', function () {
      const uri = shopifyToken.generateAuthUrl(
        'qux',
        undefined,
        undefined,
        'per-user'
      );
      const nonce = url.parse(uri, true).query.state;

      expect(nonce).to.be.a('string').and.have.length(32);
      expect(uri).to.equal(url.format({
        pathname: '/admin/oauth/authorize',
        hostname: 'qux.myshopify.com',
        protocol: 'https:',
        query: {
          scope: 'read_content',
          state: nonce,
          redirect_uri: 'bar',
          client_id: 'baz',
          'grant_options[]': 'per-user'
        }
      }));
    });
  });

  describe('#verifyHmac', function () {
    it('returns true if the message is authentic', function () {
      expect(shopifyToken.verifyHmac({
        hmac: '3d9b9a7918ac20dfd03b6a0af54a58f0a47980145ae81a37f41597a1e34b528d',
        state: 'b77827e928ee8eee614b5808d3276c8a',
        code: '4d732838ad8c22cd1d2dd96f8a403fb7',
        shop: 'qux.myshopify.com',
        timestamp: '1451929074'
      })).to.equal(true);

      expect(shopifyToken.verifyHmac({
        hmac: 'ffe89c5d47dd26297d47b68e6ad14cf4ee6f11a72b3da7c7a0974d0c3959579a',
        shop: 'qux.myshopify.com',
        timestamp: '1492784493',
        quuz: [1, 2],
        corge: 'grault'
      })).to.equal(true);
    });

    it('returns false if the message is not authentic', function () {
      expect(shopifyToken.verifyHmac({
        hmac: '3d9b9a7918ac20dfd03b6a0af54a58f0a47980145ae81a37f41597a1e34b528d',
        state: 'b77827e928ee8eee614b5808d3276c8a',
        code: '4d732838ad8c22cd1d2dd96f8a403fb7',
        shop: 'qux.myshopify.com',
        timestamp: '1451933938'
      })).to.equal(false);
    });

    it('returns false if the query object is empty', function () {
      expect(shopifyToken.verifyHmac({})).to.equal(false);
    });
  });

  describe('#getAccessToken', function () {
    const pathname = '/admin/oauth/access_token';
    const hostname = 'qux.myshopify.com';
    const scope = nock(`https://${hostname}`, { allowUnmocked: true });

    afterEach(function () {
      expect(scope.isDone()).to.be.true;
    });

    it('exchanges the auth code for the access token', function () {
      const code = '4d732838ad8c22cd1d2dd96f8a403fb7';
      const reply =  {
        access_token: 'f85632530bf277ec9ac6f649fc327f17',
        scope: 'read_content'
      };

      scope
        .post(pathname, { client_secret: 'foo', client_id: 'baz', code })
        .reply(200, reply);

      return shopifyToken.getAccessToken(hostname, code)
        .then((data) => expect(data).to.deep.equal(reply));
    });

    it('honors the `agent` option', function () {
      const code = '4d732838ad8c22cd1d2dd96f8a403fb7';
      const requestBody = {
        client_secret: 'foo',
        client_id: 'baz',
        code
      };
      const stringifiedRequestBody = JSON.stringify(requestBody);

      const responseBody =  {
        access_token: 'f85632530bf277ec9ac6f649fc327f17',
        scope: 'read_content'
      };
      const stringifiedResponseBody = JSON.stringify(responseBody);

      const agent = new https.Agent();

      agent.createConnection = function () {
        const duplex = new stream.Duplex({
          read() {},
          write(chunk, encoding, callback) {
            if (chunk.length === 0) {
              callback();
              return;
            }

            expect(chunk.toString()).to.equal([
              `POST ${pathname} HTTP/1.1`,
              `Content-Length: ${Buffer.byteLength(stringifiedRequestBody)}`,
              'Content-Type: application/json',
              'Accept: application/json',
              `Host: ${hostname}`,
              'Connection: close',
              '',
              stringifiedRequestBody
            ].join('\r\n'));

            duplex.push([
              'HTTP/1.1 200 OK',
              'Content-Type: application/json',
              `Content-Length: ${Buffer.byteLength(stringifiedResponseBody)}`,
              'Connection: close',
              `Date: ${new Date().toUTCString()}`,
              '',
              stringifiedResponseBody
            ].join('\r\n'));

            callback();
          }
        });

        return duplex;
      }

      const shopifyToken = new ShopifyToken({
        sharedSecret: 'foo',
        redirectUri: 'bar',
        apiKey: 'baz',
        agent
      });

      return shopifyToken.getAccessToken(hostname, code)
        .then((data) => expect(data).to.deep.equal(responseBody));
    });

    it('returns an error if the request fails', function () {
      const message = 'Something wrong happened';

      scope
        .post(pathname)
        .replyWithError(message);

      return shopifyToken.getAccessToken(hostname, '123456').then(() => {
        throw new Error('Test invalidation');
      }, (err) => {
        expect(err).to.be.an.instanceof(Error);
        expect(err.message).to.equal(message);
      });
    });

    it('returns an error when timeout expires (headers)', function () {
      const shopifyToken = new ShopifyToken({
        sharedSecret: 'foo',
        redirectUri: 'bar',
        apiKey: 'baz',
        timeout: 100
      });

      scope
        .post(pathname)
        .delay({ head: 200 })
        .reply(200, {});

      return shopifyToken.getAccessToken(hostname, '123456').then(() => {
        throw new Error('Test invalidation');
      }, (err) => {
        expect(err).to.be.an.instanceof(Error);
        expect(err.message).to.equal('Request timed out');
      });
    });

    it('returns an error when timeout expires (body)', function () {
      const shopifyToken = new ShopifyToken({
        sharedSecret: 'foo',
        redirectUri: 'bar',
        apiKey: 'baz',
        timeout: 100
      });

      scope
        .post(pathname)
        .delay({ body: 200 })
        .reply(200, {});

      return shopifyToken.getAccessToken(hostname, '123456').then(() => {
        throw new Error('Test invalidation');
      }, (err) => {
        expect(err).to.be.an.instanceof(Error);
        expect(err.message).to.equal('Request timed out');
      });
    });

    it('returns an error when timeout expires (connection)', function () {
      const shopifyToken = new ShopifyToken({
        sharedSecret: 'foo',
        redirectUri: 'bar',
        apiKey: 'baz',
        timeout: 100
      });

      //
      // `scope.delay()` can only delay the `response` event. The connection is
      // still established so it is useless for this test. To work around this
      // issue a non-routable IP address is used here instead of `nock`. See
      // https://tools.ietf.org/html/rfc5737#section-3
      //
      return shopifyToken.getAccessToken('192.0.2.1', '123456').then(() => {
        throw new Error('Test invalidation');
      }, (err) => {
        expect(err).to.be.an.instanceof(Error);
        expect(err.message).to.equal('Request timed out');
      });
    });

    it('returns an error if response statusCode is not 200', function () {
      const body = 'some error message from shopify';

      scope
        .post(pathname)
        .reply(400, body);

      return shopifyToken.getAccessToken(hostname, '123456').then(() => {
        throw new Error('Test invalidation');
      }, (err) => {
        expect(err).to.be.an.instanceof(Error);
        expect(err).to.have.property('message', 'Failed to get Shopify access token');
        expect(err).to.have.property('responseBody', body);
        expect(err).to.have.property('statusCode', 400);
      });
    });

    it('returns an error if JSON.parse throws', function () {
      const body = '<!DOCTYPE html><html><head></head><body></body></html>';

      scope
        .post(pathname)
        .reply(200, body);

      return shopifyToken.getAccessToken(hostname, '123456').then(() => {
        throw new Error('Test invalidation');
      }, (err) => {
        expect(err).to.be.an.instanceof(Error);
        expect(err).to.have.property('message', 'Failed to parse the response body');
        expect(err).to.have.property('responseBody', body);
        expect(err).to.have.property('statusCode', 200);
      });
    });
  });
});
