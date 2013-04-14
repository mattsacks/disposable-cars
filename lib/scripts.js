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

// get a date at it's 10th minute interval
Date.prototype.getTenth = function() {
  var interval = Math.floor(this.getMinutes() / 10);
  var clone = new Date(this);
  clone.setMilliseconds(0);
  clone.setSeconds(0);
  clone.setMinutes(10 * interval);
  return clone;
};

// single-purpose utility of today's nth interval in 10-minutes
Date.nowsTenth = (function() {
  return new Date().getTenth();
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

// throttles a function, from underscore.js
var throttle = function(func, wait) {
  var context, args, timeout, result;
  var previous = 0;
  var later = function() {
    previous = new Date;
    timeout = null;
    result = func.apply(context, args);
  };
  return function() {
    var now = new Date;
    var remaining = wait - (now - previous);
    context = this;
    args = arguments;
    if (remaining <= 0) {
      clearTimeout(timeout);
      timeout = null;
      previous = now;
      result = func.apply(context, args);
    } else if (!timeout) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };
};

// dbounce a function, from underscore.js
var debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

// taken from Collector.js
var mapreduce = function(data, mappings, reductions) {
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
  }
};

var reductions = {
  numDays: function(cur, delta) {
    cur = cur || 0;
    if (delta > cur) cur = delta;
    return cur;
  }
};

var calculate = function() {
  return mapreduce(cars, mappings, reductions);
};

// constructor
var Graph = function() {
  // car data and each individual car2go found in portland by license
  this.cars = window.cars;
  this.ids = Object.keys(this.cars);

  // the number of days tracked
  this.nDays = window.data.numDays;

  // the timestamp intervals in ms being tracked
  this.interval = 600000; // 10 minutes

  // the interval to update the graph with
  this.speed = 200;

  // the start of it
  this.start = new Date().clearTime().decrement('day', this.nDays);
  this.timestamp = +this.start;

  // get elements
  this.gather();
  // attach to elements
  this.attach();

  // get configuration for mapreduce and calculate
  this.stats = this.defineStats();
};

// gather elements & element-related functions
Graph.prototype.gather = function() {
  // parent element
  this.container = d3.select('#map');
  // create an svg element
  this.svg = this.svg ||
    this.container.append('svg').attr('id', 'map-graph');

  // the count text
  this.count = d3.select('#count');

  // the time element
  this.time = d3.select('#time');
  // format as "{day of week} at {24hour:minute} {AM/PM}"
  this.timeFormat = d3.time.format('%A at %H:%M');
  // timeline element
  this.timeline = d3.select('#timeline');

  // collect scales
  this.getScales();
};

// collect scales based on browser size
Graph.prototype.getScales = function() {
  // get an x scale from the starting date to the ending date for the width of
  // the map
  var width = this.container.node().clientWidth;
  var start = +new Date(this.start);
  var end = +Date.nowsTenth;
  this.xscale = d3.scale.linear()
    .domain([start, end])
    .range([0, width]);
};

// attach events to handlers
Graph.prototype.attach = function() {
  var thiz = this;
  var timeline = this.timeline.node();

  timeline.addEventListener('mousemove', throttle(function(e) {
    var x = e.offsetX;
    var timestamp = thiz.xscale.invert(x);
    thiz.timestamp = +new Date(timestamp).getTenth();

    thiz.stopAnimating = true;
    thiz.update(thiz.timestamp);
  }, 15));

  this.container.node().addEventListener('mouseover', function() {
    thiz.stopAnimating = false;
    thiz.animate();
  });

  window.addEventListener('resize', throttle(function() {
    // update the timeline
    thiz.getScales();
    thiz.drawTimeline();
    thiz.drawTimepath();
  }, 25));
};

// draws the axis and ticks under the map
Graph.prototype.drawTimeline = function() {
  // clear any ticks previously drawn
  this.timeline.select('.tick-container').remove();

  // get attributes from the #timeline element
  var element = this.timeline.node();
  var height = element.clientHeight;
  var start = +new Date(this.start);
  var end = +Date.nowsTenth;

  var container = this.timeline.append('svg:g')
    .attr({
      'class': 'tick-container',
    })

  // draw a timeline marker
  var marker = this.timeline.append('svg:line')
    .attr({
      'class': 'time-marker',
      'y1': height - 20,
      'y2': height
    });

  // number of ticks we need
  var ticks = (end - start) / this.interval;

  // iterate from the first interval to the number of ticks found
  // don't start at 0 to prevent drawing a tick on the left side of the page
  for (var i = 1; i < ticks; i++) {
    var attrs = {};

    // small tick = every % 6 (1 hour)
    // big tick = every % 36 (6 hours)
    // divider = every day % 144 (24 hours)
    if (i % 144 == 0) {
      attrs = {
        'class': 'divider',
        'y1': height - 30
      };
    }
    else if (i % 36 == 0) {
      attrs = {
        'class': 'big-tick',
        'y1': height - 15
      };
    }
    else if (i % 6 == 0) {
      attrs = {
        'class': 'small-tick',
        'y1': height - 5
      }
    }

    // if we found an interval for the tick
    if (attrs.y1 != null) {
      // get the x-coordinate from the tick scale
      var x = this.xscale(start + (i * this.interval));

      // append a tick mark
      container.append('svg:line')
        .attr(attrs)
        .attr({
          'y2': height,
          'x1': x,
          'x2': x
        })
    }
  }
};

// draws the path element in the timeline
Graph.prototype.drawTimepath = function() {
  var thiz = this;
  var height = this.timeline.node().clientHeight;

  // yscale from 0 number cars found to the max num of cars is the
  // total number found in the dataset
  var yscale = d3.scale.linear()
    .domain([100, this.ids.length])
    .range([height, 0]);

  // path function
  var path = d3.svg.line()
    .x(this.xscale)
    .y(function(d) {
      thiz.timestamp = d;
      return yscale(thiz.calculate().numCars);
    });

  // area function
  var area = d3.svg.area()
    .x(this.xscale)
    .y0(height)
    .y1(function(d) {
      thiz.timestamp = d;
      return yscale(thiz.calculate().numCars);
    });

  // generate a range of time intervals between the start and end
  var start = +new Date(this.start);
  var end = +new Date(Date.nowsTenth);
  var timestamps = d3.range(start, end, this.interval);

  var generatePath = function(className, dFunction) {
    // remove any existing path first
    thiz.timeline.selectAll('path.' + className).remove();
    return thiz.timeline.selectAll('path.' + className)
      .data([timestamps])
      .enter()
      .append('svg:path')
      .attr({
        'class': className,
        'd': dFunction
      });
  };

  generatePath('count-area', area);
  // generatePath('count-path', path);

  // reset timestamp to beginning
  this.timestamp = +start;
};

Graph.prototype.animate = function(start, speed) {
  var thiz = this;
  // clear any existing animation loop
  if (this['animation'] != null)
    this.animation = clearTimeout(this.animation);

  this.timestamp = start || this.timestamp;
  speed = speed || this.speed;

  // draw all cars hidden to start
  this.circles = this.circles || this.svg.selectAll('.car')
    .data(this.ids)
    .enter()
    .append('svg:circle')
    .attr({
      'class': 'car hide',
      'r': 5,
      'data-id': function(car) {
        return car;
      }
    });

  // set a timeout that can be cleared if this is being called again
  var loop = function() {
    thiz.update(thiz.timestamp, speed);
    thiz.timestamp += thiz.interval;

    thiz.animation = thiz.stopAnimating == true ?
      // set the animation to undefined if told to stop udating
      clearTimeout(thiz.animation) :
      // otherwise, keep animating
      setTimeout(loop, speed);
  };
  loop();
};

// update the graph components and car positions
Graph.prototype.update = function(timestamp, speed) {
  timestamp = timestamp || this.timestamp;
  speed = speed || this.speed; // FIXME for 0

  var marker = this.timeline.select('.time-marker');

  // don't try to update if we're at a time beyond what we'll have data for
  if (timestamp > +Date.nowsTenth) return;

  // redraw all the cars with the current timestamp
  this.updateCars(timestamp);

  // update mapreduce stats
  this.data = this.calculate();

  // update text stats
  // this.count.text(this.data.numCars + ' cars available');
  this.time.text(this.timeFormat(new Date(timestamp)));

  // update the position of the timeline marker
  var x = this.xscale(timestamp);

  // only animate when we're not updating FIXME
  var m = this.stopAnimating ?
    marker : marker.transition().duration(speed).ease('linear');

  m.attr({
    'x1': x,
    'x2': x
  });
}

// updates the car positions according to the given timestamp
Graph.prototype.updateCars = function(timestamp) {
  var thiz = this;
  timestamp = timestamp || +this.ago;

  // updates an individual car by it's id
  var update = function(car) {
    var location = thiz.cars[car][timestamp];
    var noLocation = location == null;
    var circle = d3.select(this);

    circle.classed('hide', noLocation);
    if (noLocation) return;

    var coords = thiz.getCoords(location);

    var c = thiz.stopAnimating ? circle :
      circle.transition().duration(thiz.speed);

    c.attr({
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

// calculations on data
Graph.prototype.calculate = function(data, stats) {
  // default object of data to mapreduce on
  data = data || this.cars;
  // default stats object with mappings and reductions keys 
  stats = stats || this.stats || this.defineStats();

  return mapreduce(data, stats.mappings, stats.reductions);
};

// a schema to mapreduce the dataset on
Graph.prototype.defineStats = function() {
  var thiz = this;

  return {
    mappings: {
      // boolean value if there was a location found for the current
      // configured timestamp
      numCars: function(car) {
        return car[thiz.timestamp] != null;
      }
    },

    reductions: {
      // return a count for the number of cars found with a location
      // at the current timestamp
      numCars: function(sum, haslocation) {
        sum = sum || 0;
        if (haslocation) sum += 1;
        return sum;
      }
    }
  }
}

// yes I use global references
// deal with it
var init = function() {
  // calculate the data
  data = calculate();

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
  graph.drawTimepath();
  graph.drawTimeline();
  graph.animate();
}

// when we're ready
window.onload = init;
