// alias id = getElementById
document.id = document.getElementById;

// get the last element in an array
Array.prototype.last = function() {
  return this[this.length - 1];
};

// 24 hours in milliseconds
Date.day = 86400000;
// array of days of the week
Date.days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// set a date to midnight
Date.prototype.clearTime = function() {
  this.setMilliseconds(0);
  this.setSeconds(0);
  this.setMinutes(0);
  this.setHours(0);
  return this;
};

// decrease the Date {range} by {amount}
Date.prototype.decrement = function(range, amount) {
  var change = Date.day;
  if (range === 'week') change *= 7;
  // TODO moar ranges

  change *= amount;

  // return a date object, not the date time
  return new Date(this.setTime(+this - change));
};

// single-purpose utility of today's nth interval in 10-minutes
Date.nowsTenth = (function() {
  var interval = Math.floor(new Date().getMinutes() / 10);
  var today = new Date();
  today.setMilliseconds(0);
  today.setSeconds(0);
  today.setMinutes(10 * interval);
  return today;
})();

// return a Mustache function of the a template element's innerHTML
var getTemplate = function(id) {
  var templateElement = document.id(id + '-template');
  var templateString = templateElement.innerHTML.trim();
  return Mustache.compile(templateString);
};

// render a Mustache function
var render = function(element, template, data, partials) {
  element.innerHTML = template(data, partials);
  return element;
};


// taken from Collector.js
var reduce = function(data, mappings, reductions) {
  // the returned object
  var collection = {};

  for (var item in data) {
    var datum = data[item];

    for (var key in mappings) {
      var map = mappings[key], reduce;
      if (map == null) continue;

      reductions != null && (reduce = reductions[key]);

      // call a map on the piece of data
      var result  = map(datum, item);
      var rolling = collection[key];

      // if a reduce function isn't defined for this key, then just map
      if (reduce == null) {
        collection[key] = collection[key] || [];
        collection[key].push(result);
        continue;
      }

      // if there was a result from the mapping, call it as the first
      // argument.  otherwise, same format as the mapping
      result = result != null ?
        reduce(rolling, result, datum, item) :
        reduce(rolling, datum, item);

      collection[key] = result;
    }

  }
  return collection;
};

// things to iterate over each car
var mappings = {
  // return the delta (in days) between the first and last recorded timestamp
  numDays: function(data, name) {
    var timestamps = Object.keys(data);
    var first = new Date(+timestamps[0]).clearTime();
    var last = new Date(+timestamps.last()).clearTime();
    return (last - first) / Date.day;
  },
};

var reductions = {
  numDays: function(cur, delta) {
    cur = cur || 0;
    if (delta > cur) cur = delta;
    return cur;
  }
};

// constructor
var Graph = function() {
  // car data and each individual car2go found in portland by license
  this.data = window.cars;
  this.cars = Object.keys(this.data);

  // the number of days tracked
  this.nDays = 5;

  // the timestamp intervals in ms being tracked
  this.interval = 600000; // 10 minutes

  // the start of it
  this.ago = new Date().clearTime().decrement('day', this.nDays);

  // parent element
  this.container = d3.select('#map');
  // create an svg element
  this.svg = this.container.append('svg').attr('id', 'map-graph');
  // the time element
  this.time = d3.select('#time');
  // format as "{day of week} at {24hour:minute} {AM/PM}"
  this.timeFormat = d3.time.format('%A at %H:%M %p');

  this.timeline = d3.select('#map');
};

Graph.prototype.startDrawing = function(start) {
  var thiz = this;
  start = start || +new Date(this.ago);

  // draw all cars hidden to start
  this.circles = this.svg.selectAll('.car')
    .data(this.cars)
    .enter()
    .append('svg:circle')
    .attr({
      'class': 'car hide',
      'r': 3.5,
    });

  var update = function() {
    if (start < +Date.nowsTenth) {
      thiz.updateCars(start);
      thiz.time.text(thiz.timeFormat(new Date(start)));

      var shownCars = thiz.circles.filter(function() {
        return !d3.select(this).classed('hide');
      });

      start += thiz.interval;
      // setTimeout(update, 75);
    }
  };

  update();
};

Graph.prototype.updateCars = function(timestamp) {
  var thiz = this;
  timestamp = timestamp || +this.ago;

  var update = function(car) {
    var location = thiz.data[car][timestamp];
    var noLocation = location == null;
    var circle = d3.select(this);

    circle.classed('hide', noLocation);
    if (noLocation) return;

    var coords = thiz.getCoords(location);
    circle.attr({
      cx: coords.x,
      cy: coords.y
    });
  };

  this.circles.each(update);
};

// return an { x: x, y: y } object from a single location data
Graph.prototype.getCoords = function(location) {
  var coords = {
    lon: location[0],
    lat: location[1]
  };
  return window.map.locationPoint(coords);
};

Graph.prototype.getIntervals = function() {
  // today at it's 10-minute interval
  var today = Date.nowsTenth();

  // starting at midnight nDays ago
  var ago = new Date().clearTime().decrement('day', this.nDays);
  var intervals = [];
  var diff = (+today - +ago) / this.interval;

  // starting from this.nDays ago, increase i until it no longer exists
  for (var i = +ago, max = +today; i < max; i += this.interval) {
    intervals.push(i);
  }
};

// yes I use global references
var init = function() {
  // calculate the data
  data = reduce(cars, mappings, reductions);

  // create map
  layer = mapbox.layer().id('mattsacks.map-pnviow60');
  // disable panning + zooming
  map = mapbox.map('map', layer, null, []);

  map.lat = 45.53252364902761;
  map.lon = -122.63711792602537;

  map.centerzoom({
    lat: map.lat,
    lon: map.lon
  }, 13);

  // create the graph
  graph = new Graph;
  graph.startDrawing();
}

// when we're ready
window.onload = init;
