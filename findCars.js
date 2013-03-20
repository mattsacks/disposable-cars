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

// get in existing JSON data
// TODO check if the file exists, if not then let cars be an empty object
var cars = require('./cars').cars || {};

// go through the JSON and remove any coordinates that are older than 5 days
// this is pretty inefficient but makes it easier to work with the JSON in the
// browser
var today = new Date().getDay();
for (var car in cars) {
  for (var timestamp in cars[car]) {
    // if the timestamp is 5 days old, delete it
    if (new Date(+timestamp).getDay() + 5 < today)
      delete cars[car];
  }
}

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
  timestamp.setMilliseconds(0);
  timestamp.setSeconds(0);
  timestamp.setMinutes(10 * interval);

  // for each car in the JSON, access it's previous data and ammend it
  for (var i = 0, len = availableCars.length; i < len; i++) {
    var availableCar = availableCars[i];
    var name = availableCar.name;
    var car = cars[name];

    // create an object for the car if it doesn't exist
    if (car == null) car = cars[name] = {};

    // add a key for the current 10 minute interval and 
    car[+timestamp] = availableCar.coordinates;
  }

  // string of code to test if window or exports to evaluate as javascript
  var globalString =
    ";\nif (typeof module !== 'undefined') exports.cars = cars;\nelse window.cars = cars;";

  // write the JSON out
  fs.writeFileSync(
    'cars.js',
    "var cars = " + JSON.stringify(cars) + globalString
  );
});
