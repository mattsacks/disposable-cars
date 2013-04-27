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
