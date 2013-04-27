// fs
var fs = require('fs');
// buffer of the cars file
var cars = fs.readFileSync('cars.js');

// require aws
var AWS = require('aws-sdk');
// config
AWS.config.loadFromPath('./AWS');
// endpoint
var endpoint = new AWS.Endpoint('https://s3.amazonaws.com');

// s3
var s3 = new AWS.S3({
  credentials: AWS.config.credentials,
  endpoint: endpoint
});

var expires = new Date();
expires.setMinutes(expires.getMinutes() + 10);

// upload cars.js
s3.putObject({
  ACL: 'public-read',
  Body: cars,
  Bucket: 'my-s3-bukkit',
  ContentType: 'text/javascript',
  CacheControl: 'max-age=600',
  Expires: expires,
  Key: 'cars.js'
});
