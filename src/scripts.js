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
  graph.drawTimeline();
  graph.animate();
}

// when we're ready
window.onload = init;
