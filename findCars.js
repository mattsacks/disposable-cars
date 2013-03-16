// packages
var https = require('https');
var fs = require('fs');
var querystring = require('querystring');

// car2go oauth_consumer_key
var OAUTH_KEY = fs.readFileSync('C2G_OAUTH_KEY', 'utf8').trim();

// url string
var vehiclesString = querystring.stringify({
  loc: 'portland',
  oauth_consumer_key: OAUTH_KEY,
  format: 'json'
});

// request object to find all available cars
var findCars = 'https://www.car2go.com/api/v2.1/vehicles?' + vehiclesString;

var availableCars = {};

// lets find some cars
https.get(findCars, function(res) {
  var json = '';
  res.setEncoding('utf8');

  // stream the data in
  res.on('data', function(data) {
    json += data;
  });

  // when the data is finished streaming, parse it
  res.on('end', function() {
    availableCars = JSON.parse(json);
  });
});
