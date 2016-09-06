'use strict';

var session = require('express-session')
  , ShopifyToken = require('../')
  , express = require('express')
  , config = require('./config');

var shopifyToken = new ShopifyToken(config);

var app = express();

app.use(session({
  secret: 'eo3Athuo4Ang5gai',
  saveUninitialized: false,
  resave: false
}));

app.get('/', function (req, res) {
  if (req.session.token) return res.send('Token ready to be used');

  //
  // Generate a random nonce.
  //
  var nonce = shopifyToken.generateNonce();

  //
  // Generate the authorization URL. For the sake of simplicity the shop name
  // is fixed here but it can, of course, be passed along with the request and
  // be different for each request.
  //
  var uri = shopifyToken.generateAuthUrl(config.shop, undefined, nonce);

  //
  // Save the nonce in the session to verify it later.
  //
  req.session.state = nonce;
  res.redirect(uri);
});

app.get('/callback', function (req, res) {
  var state = req.query.state;

  if (
      typeof state !== 'string'
    || state !== req.session.state          // Validate the state.
    || !shopifyToken.verifyHmac(req.query)  // Validare the hmac.
  ) {
    return res.status(400).send('Security checks failed');
  }

  //
  // Exchange the authorization code for a permanent access token.
  //
  shopifyToken.getAccessToken(req.query.shop, req.query.code, function (err, token) {
    if (err) {
      console.error(err.stack);
      return res.status(500).send('Oops, something went wrong');
    }

    console.log(token);

    req.session.token = token;
    req.session.state = undefined;
    res.redirect('/');
  });
});

app.listen(8080, function () {
  console.log('Open http://localhost:8080 in your browser');
});
