var init = function() {
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
