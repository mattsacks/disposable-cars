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
      // transfer the car towards it's next location
      else {
        circle.classed('moving', true);
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
        .classed('hide', false)
        .classed('moving', false)
        .attr({
          cx: coords.x,
          cy: coords.y,
          'data-timestamp': timestamp
        });
    }
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
