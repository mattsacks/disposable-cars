// when we're ready, make the app
window.onload = function() {
  mobile = new RegExp('(iphone|android)', 'i')
    .test(navigator.userAgent);

  if (mobile)
    document.body.classList.add('mobile');

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
