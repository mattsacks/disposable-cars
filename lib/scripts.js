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

Date.prototype.decrement = function(range, amount) {
  var change = Date.day;
  if (range === 'week') change *= 7;
  // TODO moar ranges

  change *= amount;
  return this.setTime(+this - change).valueOf();
};

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

// setup the dayPicker
var DayPicker = function() {
  this.template = getTemplate('dayPicker');
  this.element = document.id('dayPicker');

  // default to the last day (today) being active
  this.activeIndex = data.numDays-1;

  return this;
};

DayPicker.prototype.render = function() {
  var thiz = this;
  var i = data.numDays;
  var days = [];
  var today = new Date().clearTime();

  while(i--) {
    days.push(new Date(today).decrement('day', i));
  }

  this.data = {
    // an index of days 
    days: days,

    // return the day of the week text
    dayText: function() {
      return Date.days[new Date(this).getDay()];
    },

    // return an active class for the day if it's the current selected day
    dayActive: function() {
      return thiz.data.days[thiz.activeIndex] == +this ?
        'active' : '';
    }
  };

  render(this.element, this.template, this.data);
  return this;
};

// yes I use global references
var init = function() {
  // calculate the data
  data = reduce(cars, mappings, reductions);

  // create a day picker and render it
  dayPicker = new DayPicker().render();

  // create map
  layer = mapbox.layer().id('mattsacks.map-pnviow60');
  // disable panning + zooming
  map = mapbox.map('map', layer, null, []);
  map.centerzoom({
    lat: 45.53252364902761,
    lon: -122.63711792602537
  }, 13);
}

// when we're ready
window.onload = init;
