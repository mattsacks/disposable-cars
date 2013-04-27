// yes I use global references
//
// deal with it

var load = function() {
  // set the map height to a % of the window, capped at 900px
  var height = Math.min(window.innerHeight * .675, 900);
  document.id('map').style.height = height + 'px';

  document.body.classList.remove('hide');
  graph.animate();
  hasLoaded = true;
};

var init = function() {
  hasLoaded = false;
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

  // initialize the page when the map has been loaded up
  map.addCallback('drawn', function() {
    if (!hasLoaded) load();
  });
}

// when we're ready
window.onload = init;
