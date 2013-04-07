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
