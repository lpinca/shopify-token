describe('shopify-token', function () {
  'use strict';

  var expect = require('chai').expect
    , ShopifyToken = require('./')
    , nock = require('nock')
    , url = require('url');

  var shopifyToken = new ShopifyToken({
    sharedSecret: 'foo',
    redirectUri: 'bar',
    apiKey: 'baz'
  });

  it('exports the contructor', function () {
    expect(ShopifyToken).to.be.a('function');
  });

  it('throws an error when the required options are missing', function () {
    expect(function () {
      new ShopifyToken();
    }).to.throw(Error, /Missing or invalid options/);

    expect(function () {
      new ShopifyToken({ scopes: 'write_content' });
    }).to.throw(Error, /Missing or invalid options/);
  });

  it('makes the new operator optional', function () {
    var shopifyToken = ShopifyToken({
      sharedSecret: 'foo',
      redirectUri: 'bar',
      apiKey: 'baz'
    });

    expect(shopifyToken).to.be.an.instanceof(ShopifyToken);
  });

  it('uses a default scope', function () {
    expect(shopifyToken.scopes).to.equal('read_content');
  });

  it('allows to customize the default scopes', function () {
    var shopifyToken = ShopifyToken({
      scopes: 'read_content,write_content',
      sharedSecret: 'foo',
      redirectUri: 'bar',
      apiKey: 'baz'
    });

    expect(shopifyToken.scopes).to.equal('read_content,write_content');
  });

  describe('#generateNonce', function () {
    it('generates a random nonce', function () {
      var nonce = shopifyToken.generateNonce();

      expect(nonce).to.be.a('string').and.have.length(32);
    });
  });

  describe('#generateAuthUrl', function () {
    it('builds the authorization URL', function () {
      var uri = shopifyToken.generateAuthUrl('qux')
        , nonce = url.parse(uri, true).query.state;

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
      var uri = shopifyToken.generateAuthUrl('qux', 'read_themes,read_products')
        , nonce = url.parse(uri, true).query.state;

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
      var uri = shopifyToken.generateAuthUrl('qux', [
        'read_products',
        'read_themes'
      ]);
      var nonce = url.parse(uri, true).query.state;

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
      var uri = shopifyToken.generateAuthUrl('qux', undefined, 'corge');

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

    it('returns false if the properties values are not strings', function () {
      expect(shopifyToken.verifyHmac({ foo: [1, 2] })).to.equal(false);
    });
  });

  describe('#getAccessToken', function () {
    var pathname = '/admin/oauth/access_token'
      , hostname = 'qux.myshopify.com'
      , scope = nock('https://' + hostname);

    afterEach(function () {
      expect(scope.isDone()).to.be.true;
    });

    it('exchanges the auth code for the access token', function (done) {
      var token = 'f85632530bf277ec9ac6f649fc327f17'
        , code = '4d732838ad8c22cd1d2dd96f8a403fb7';

      scope
        .post(pathname, {
          client_secret: 'foo',
          client_id: 'baz',
          code: code
        })
        .reply(200, { access_token: token });

      shopifyToken.getAccessToken(hostname, code, function (err, res) {
        if (err) return done(err);

        expect(res).to.equal(token);
        done();
      });
    });

    it('returns an error if the request fails', function (done) {
      var message = 'Something wrong happened';

      scope
        .post(pathname)
        .replyWithError(message);

      shopifyToken.getAccessToken(hostname, '123456', function (err, res) {
        expect(err).to.be.an.instanceof(Error);
        expect(err.message).to.equal(message);
        expect(res).to.equal(undefined);
        done();
      });
    });

    it('returns an error if response statusCode is not 200', function (done) {
      var body = 'some error message from shopify';

      scope
        .post(pathname)
        .reply(400, body);

      shopifyToken.getAccessToken(hostname, '123456', function (err, res) {
        expect(err).to.be.an.instanceof(Error);
        expect(err).to.have.property('message', 'Failed to get Shopify access token');
        expect(err).to.have.property('responseBody', body);
        expect(err).to.have.property('statusCode', 400);
        expect(res).to.equal(undefined);
        done();
      });
    });

    it('returns an error if JSON.parse throws', function (done) {
      var body = '<!DOCTYPE html><html><head></head><body></body></html>';

      scope
        .post(pathname)
        .reply(200, body);

      shopifyToken.getAccessToken(hostname, '123456', function (err, res) {
        expect(err).to.be.an.instanceof(Error);
        expect(err).to.have.property('message', 'Failed to parse the response body');
        expect(err).to.have.property('responseBody', body);
        expect(err).to.have.property('statusCode', 200);
        expect(res).to.equal(undefined);
        done();
      });
    });
  });
});
