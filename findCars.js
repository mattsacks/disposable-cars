// packages
var https = require('https');
var fs = require('fs');
var querystring = require('querystring');

// fuck you node
var Emitter = require('events').EventEmitter;
var event = new Emitter().constructor.prototype;

// car2go oauth_consumer_key
// TODO check if the file exists, if not then throw an error
var OAUTH_KEY = fs.readFileSync('C2G_OAUTH_KEY', 'utf8').trim();

// read in existing JSON data
// TODO check if the file exists, if not then let cars be an empty object
var cars = JSON.parse(fs.readFileSync('cars.json', 'utf8'));

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

  // when the data is finished streaming
  res.on('end', function() {
    // parse the JSON and let others know we're done
    event.emit('json', JSON.parse(json));
  });
});

// listen to the JSON having completed and save it to a local json file
event.on('json', function(json) {
  // array of car data
  var availableCars = json.placemarks;

  // the current interval in 10 minute increments, always round down
  var interval = Math.floor(new Date().getMinutes() / 10);
  // reset the timestamp to an interval of 10 minutes
  var timestamp = new Date();
  timestamp.setSeconds(0);
  timestamp.setMinutes(10 * interval);

  // for each car in the JSON, access it's previous data and ammend it
  for (var i = 0, len = availableCars.length; i < len; i++) {
    var availableCar = availableCars[i];
    var name = availableCar.name;
    var car = cars[name];

    // create the array of locations for the car if it doesn't exist
    if (car == null) car = cars[name] = [{}];

    // TODO if the length of the car days is 6, then pop the last one off

    // today's locations 
    var locations = car[0];
    
    // add a key for the current 10 minute interval and 
    locations[+timestamp] = availableCar.coordinates;
  }

  // write the JSON out
  fs.writeFileSync('cars.json', JSON.stringify(cars));
});
