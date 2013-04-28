// handle loading data asynchronously and the loading animation

// app class
var App = function() {
  this.hasLoaded = false;
  this.startLoading();
};

App.prototype.startLoading = function() {
  var thiz = this;
  // start the animation
  this.loadElement = document.id('loader');

  var svg = d3.select(this.loadElement)
    .select('.load-container')
    .append('svg')
    .attr('class', 'load-animation');
  var container = svg.append('svg:g')
    .attr('class', 'circle-container');
  container.append('svg:circle')
    .attr({
      'class': 'big-circle',
      'r': 25,
      'cx': 40,
      'cy': 50
    });
  container.append('svg:line')
    .attr({
      'class': 'tick',
      'transform': 'translate(40, 25)',
      'y1': 0,
      'y2': 13
    });

  // round and round the circle goes
  var rotate = function() {
    container.transition()
      .duration(1000)
      .attrTween('transform', function() {
        return d3.interpolateString(
          'rotate(0 40 50)', 'rotate(360 40 50)'
        );
      })
      .each('end', function() {
        // loop if we haven't loaded yet
        if (!thiz.hasLoaded) rotate();
      });
  };
  
  rotate();
  this.load();
};

App.prototype.stopLoading = function() {
  var thiz = this;
  var element = d3.select(this.loadElement);

  // preserve the rotated state before starting another transition
  var container = element.select('.circle-container');
  var rotate = container.attr('transform');
  // end the existing transition
  container.transition();
  // and set the rotated state back
  container.attr('transform', rotate);

  // remove the cover over the timeline
  d3.select('.timeline-cover')
    .transition()
    .duration(1000)
    .style('opacity', 0)
    .each('end', function() {
      this.style.display = 'none';
    });

  // fade out and move the loader up
  element
    .transition()
    .duration(1000)
    .style({
      'opacity': 0,
      'top': -10 + 'px'
    })
    .each('end', function() {
      element.classed('hide', true);
    });
};

// load up the page
App.prototype.load = function() {
  var thiz = this;

  // set the map height to a % of the window, capped at 900px
  var height = Math.min(window.innerHeight * .675, 900);
  document.id('map').style.height = Math.floor(height) + 'px';

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

    // start it
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
