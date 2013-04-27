// yes I use global references
//
// deal with it

var loadCars = function(callback) {
  // data has already been loaded
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

var load = function() {
  // set the map height to a % of the window, capped at 900px
  var height = Math.min(window.innerHeight * .675, 900);
  document.id('map').style.height = height + 'px';

  document.body.classList.remove('hide');
  hasLoaded = true;

  // load up the data
  loadCars(function() {
    // calculate the data
    data = calculate();

    // create the graph and draw it out
    graph = new Graph;
    graph.drawTimepath();
    graph.drawTimeline();
    graph.animate();
  });
};

var init = function() {
  hasLoaded = false;

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

  // initialize the page when the map has been loaded up
  map.addCallback('drawn', function() {
    if (!hasLoaded) load();
  });
}

// when we're ready
window.onload = init;
