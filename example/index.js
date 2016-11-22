'use strict';

const session = require('express-session');
const express = require('express');

const ShopifyToken = require('..');
const config = require('./config');

const shopifyToken = new ShopifyToken(config);
const app = express();

app.use(session({
  secret: 'eo3Athuo4Ang5gai',
  saveUninitialized: false,
  resave: false
}));

app.get('/', (req, res) => {
  if (req.session.token) return res.send('Token ready to be used');

  //
  // Generate a random nonce.
  //
  const nonce = shopifyToken.generateNonce();

  //
  // Generate the authorization URL. For the sake of simplicity the shop name
  // is fixed here but it can, of course, be passed along with the request and
  // be different for each request.
  //
  const uri = shopifyToken.generateAuthUrl(config.shop, undefined, nonce);

  //
  // Save the nonce in the session to verify it later.
  //
  req.session.state = nonce;
  res.redirect(uri);
});

app.get('/callback', (req, res) => {
  const state = req.query.state;

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
  shopifyToken.getAccessToken(req.query.shop, req.query.code)
    .then((token) => {
      console.log(token);

      req.session.token = token;
      req.session.state = undefined;
      res.redirect('/');
    })
    .catch((err) => {
      console.error(err.stack);
      res.status(500).send('Oops, something went wrong');
    });
});

app.listen(8080, () => console.log('Open http://localhost:8080 in your browser'));
