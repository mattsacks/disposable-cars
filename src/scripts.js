// yes I use global references
//
// deal with it

var load = function() {
  // set the map height to 70% of the window, capped at 800px
  var height = Math.min(window.innerHeight * .72, 800);
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

  map.addCallback('drawn', function() {
    if (!hasLoaded) load();
  });

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
}

// when we're ready
window.onload = init;
