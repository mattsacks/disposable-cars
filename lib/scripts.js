// alias id = getElementById
document.id = document.getElementById;

// get the last element in an array
Array.prototype.last = function() {
  return this[this.length - 1];
};

// convert a date to UTC time
Date.prototype.inUTC = function() {
  var offset = this.getTimezoneOffset();
  this.setTime(+this + (offset*60000));
  return this;
};

// convert a Date to portland time
Date.prototype.inPortland = function() {
  this.inUTC();
  this.setHours(this.getHours() - 7);
  return this;
};

// 1 hour in milliseconds
Date.hour = 3600000;
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

// get a date at it's 10th minute interval
Date.prototype.getTenth = function() {
  var interval = Math.floor(this.getMinutes() / 10);
  var clone = new Date(this);
  clone.setMilliseconds(0);
  clone.setSeconds(0);
  clone.setMinutes(10 * interval);
  return clone;
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
  },
  // get locations on each car
  locations: function(car) {
    if (car.locations != null) {
      // delete known keys that aren't timestamps
      delete car.locations;
      delete car.locationsLength;
    }
    car.locations = Object.keys(car);
    car.locationsLength = car.locations.length;
    return car;
  },
  // first found timestamp
  start: function(car) {
    return +car.locations[0];
  },
  // last found timestamp
  end: function(car) {
    return +car.locations.last();
  }
};

var reductions = {
  numDays: function(cur, delta) {
    cur = cur || 0;
    return delta > cur ? delta : cur;
  },
  start: function(start, earliest) {
    return start == null ? earliest :
      earliest < start ? earliest : start;
  },
  end: function(end, latest) {
    return end == null ? latest :
      latest > end ? latest : end;
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
  this.nDays = app.data.numDays;

  // the timestamp intervals in ms being tracked
  this.interval = 600000; // 10 minutes

  // the interval to update the graph with
  this.speed = 200;

  // the start of it
  this.start = new Date(app.data.start);
  // set the timestamp to be a clone of a date object at the first start
  this.timestamp = +this.start;
  this.end = app.data.end;

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

  // time elements
  this.day = {
    element: d3.select('#day'),
    // {day of week}
    format: d3.time.format('%A')
  };
  this.time = {
    element: d3.select('#time'),
    // {12hour,space padded:minute} {AM/PM}
    format: d3.time.format('%_I:%M %p')
  };

  // timeline element
  this.timeline = d3.select('#timeline');
  // height of the timeline element
  this.timeline.height = parseInt(
    this.timeline.style('height').replace(/px/, '')
  );

  // collect scales
  this.getScales();
};

// collect scales based on browser size
Graph.prototype.getScales = function() {
  this.xscale = d3.scale.linear()
    .domain([+this.start, this.end])
    .range([0, window.innerWidth]);
};

// attach events to handlers
Graph.prototype.attach = function() {
  var thiz = this;
  var timeline = this.timeline.node();

  // take an event object and update the cars at the found x location
  var getX = function(e) {
    var x = e.pageX || e.clientX;
    var timestamp = thiz.xscale.invert(x);
    thiz.timestamp = +new Date(timestamp).getTenth();

    thiz.stopAnimating = true;
    thiz.update(thiz.timestamp);
  };

  // mouse move over the timeline
  timeline.addEventListener('mousemove', throttle(getX, 15));
  // touchmove on the timeline to update it
  timeline.addEventListener('touchmove', throttle(getX, 15));
  // touchstart on the timeline to stop updating
  timeline.addEventListener('touchstart', function() {
    thiz.stopAnimating = true;
  });
  // touchend on the timeline to continue animating
  timeline.addEventListener('touchend', function() {
    thiz.stopAnimating = false;
    thiz.animate();
  });

  this.container.node().addEventListener('mouseover', function() {
    thiz.stopAnimating = false;
    thiz.animate();
  });

  window.addEventListener('resize', throttle(function() {
    // cache the current timestamp
    var timestamp = thiz.timestamp;

    // update the timeline
    thiz.getScales();
    thiz.drawTimepath();
    thiz.drawTimeline();

    // update the timestamp
    thiz.timestamp = timestamp;
  }, 25));
};

// draws the axis and ticks under the map
Graph.prototype.drawTimeline = function() {
  // clear any ticks previously drawn
  this.timeline.select('.tick-container').remove();

  var start = +this.start;
  var end = this.end;

  var container = this.timeline.append('svg:g')
    .attr({
      'class': 'tick-container',
    })

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
        'y1': this.timeline.height - 30
      };
    }
    else if (i % 36 == 0) {
      attrs = {
        'class': 'big-tick',
        'y1': this.timeline.height - 15
      };
    }
    else if (i % 6 == 0) {
      attrs = {
        'class': 'small-tick',
        'y1': this.timeline.height - 5
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
          'y2': this.timeline.height,
          'x1': x,
          'x2': x
        })
    }
  }

  var marker = d3.select('.time-marker');
  // if the marker doesn't exist yet, create it
  if (marker.empty()) {
    marker = this.timeline.append('svg:line')
      .attr({
        'class': 'time-marker',
        'y1': this.timeline.height - 20,
        'y2': this.timeline.height
      });
  }
  // otherwise, move it in front of the ticks by re-appending it to the DOM
  else {
    marker.remove();
    this.timeline.node().appendChild(marker.node());
  }
};

// draws the path element in the timeline
Graph.prototype.drawTimepath = function() {
  var thiz = this;

  // yscale from 0 number cars found to the max num of cars is the
  // total number found in the dataset
  var yscale = d3.scale.linear()
    .domain([0, this.ids.length])
    .range([this.timeline.height, 0]);

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
    .y0(this.timeline.height)
    .y1(function(d) {
      thiz.timestamp = d;
      return yscale(thiz.calculate().numCars);
    });

  // generate a range of time intervals between the start and end
  var timestamps = d3.range(+this.start, this.end, this.interval);

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
  this.timestamp = +this.start;
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
      // if we're at a time greater than available, stop
      thiz.timestamp > thiz.end ? clearTimeout(thiz.animation) :
      // otherwise, keep animating
      setTimeout(loop, speed);
  };
  loop();
};

// update the graph components and car positions
Graph.prototype.update = function(timestamp, speed) {
  timestamp = timestamp || this.timestamp;
  speed = speed || this.speed; // FIXME for 0

  // don't try to update if we're at a time beyond what we'll have data for
  if (timestamp > this.end) return this.stop();

  // redraw all the cars with the current timestamp
  this.updateCars(timestamp);

  // update mapreduce stats
  this.data = this.calculate();

  // update text stats
  var date = new Date(timestamp).inPortland();
  this.day.element.text(this.day.format(date));
  this.time.element.text(this.time.format(date));

  // update the position of the timeline marker
  var x = this.xscale(timestamp);

  // only animate when we're not updating FIXME
  var marker = this.timeline.select('.time-marker');
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
  if (timestamp == null) return;

  // updates an individual car by it's id
  var update = function(car) {
    var loc = thiz.cars[car][timestamp];
    var circle = d3.select(this);

    // the car doesn't have a location for the timestamp
    if (loc == null) {
      // if we're not animating and the car doesn't have a location, hide it
      if (thiz.stopAnimating == true) {
        circle
          .classed('moving', false)
          .classed('hide', true);
        return;
      }
      // else if we're already moving, don't touch
      else if (circle.classed('moving')) return;

      // get an index of where the previous timestamp occured
      var prevTimestamp = circle.attr('data-timestamp');
      var index = thiz.cars[car].locations.indexOf(prevTimestamp);

      // find the next index
      var nextLocTimestamp = thiz.cars[car].locations[index + 1];
      // find the next location
      var nextLoc = thiz.cars[car][nextLocTimestamp];

      // if there is no next timestamp (ie, the car is unavailable and
      // there we are still looping), the car should be hidden
      if (nextLoc == null) {
        circle.classed('hide', true);
      }
      // if the next location found is over 2 hours away, prevent from
      // drifting the car slowly to it's next found location. it's not
      // available at the current timestamp so hide it until..
      else if (+nextLocTimestamp - +prevTimestamp >= (2*Date.hour)) {
        circle.classed('hide', true);
      }
      // transfer the car towards it's next location
      else {
        // start the car moving and show it
        circle.classed({ moving: true, hide: false });
        // the difference in intervals between the next found timestamp
        var intervals = (nextLocTimestamp - timestamp) / thiz.interval;
        // next coords
        var coords = thiz.getCoords(nextLoc);

        // start the animation to the next location
        circle.transition()
          .ease('linear')
          .duration(thiz.speed * intervals)
          .attr({
            cx: coords.x,
            cy: coords.y
          })
          .each('end', function() {
            d3.select(this).classed('moving', false);
          });
      }
    }
    else {
      // should only occur the first time the car is available, so
      // show it and put it in it's location
      var coords = thiz.getCoords(loc);
      // end any existing transitions
      circle.transition();
      // move the circle to it's location
      circle
        // show the car and remove the moving class
        .classed({ hide: false, moving: false })
        .attr({
          cx: coords.x,
          cy: coords.y,
          'data-timestamp': timestamp
        });
    }
  };

  this.circles.each(update);
};

// ends any animation loop
Graph.prototype.stop = function() {
  if (this['animation'] != null)
    this.animation = clearTimeout(this.animation);
  return this;
};

// return an { x: x, y: y } object from a single location data
Graph.prototype.getCoords = function(location) {
  var coords = {
    lon: location[0],
    lat: location[1]
  };
  return map.locationPoint(coords);
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

// app class
var App = function() {
  this.hasLoaded = false;
  this.startLoading();
};

App.prototype.startLoading = function() {
  // start the animation

  this.loadElement = document.id('loader');
  
  this.load();
};

App.prototype.stopLoading = function() {
  // stop the animation

  this.loadElement.classList.add('hide');
};

// load up the page
App.prototype.load = function() {
  var thiz = this;

  // set the map height to a % of the window, capped at 900px
  var height = Math.min(window.innerHeight * .675, 900);
  document.id('map').style.height = height + 'px';

  // reveal shit
  document.body.classList.remove('hide');

  // load up the data
  this.loadData(function() {
    thiz.hasLoaded = true;

    // calculate the data
    thiz.data = calculate();

    // stop the loader
    thiz.stopLoading();

    // create the graph and draw it out
    thiz.graph = new Graph;
    thiz.graph.drawTimepath();
    thiz.graph.drawTimeline();
    thiz.graph.animate();
  });
};

App.prototype.loadData = function(callback) {
  if (window['cars'] != null) return;
  // no-op
  callback = callback || function() {};

  var script = document.createElement('script');
  script.src = 'http://my-s3-bukkit.s3.amazonaws.com/cars.js';
  script.type = 'text/javascript';
  script.onload = callback;
  // load it up
  document.body.appendChild(script);
};

// when we're ready, make the app
window.onload = function() {
  layer = mapbox.layer().id('mattsacks.map-pnviow60');
  // disable panning + zooming
  map = mapbox.map('map', layer, null, []);

  map.lat = 45.53252364902761;
  map.lon = -122.63711792602537;

  map.centerzoom({
    lat: map.lat,
    lon: map.lon
  }, 13);

  app = new App();
}
