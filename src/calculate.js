// taken from Collector.js
var mapreduce = function(data, mappings, reductions) {
  // the returned object
  var collection = {};

  for (var item in data) {
    var datum = data[item];

    for (var key in mappings) {
      var map = mappings[key], reduce;
      if (map == null) continue;

      reductions != null && (reduce = reductions[key]);

      // call a map on the piece of data
      var result  = map(datum, item);
      var rolling = collection[key];

      // if a reduce function isn't defined for this key, then just map
      if (reduce == null) {
        collection[key] = collection[key] || [];
        collection[key].push(result);
        continue;
      }

      // if there was a result from the mapping, call it as the first
      // argument.  otherwise, same format as the mapping
      result = result != null ?
        reduce(rolling, result, datum, item) :
        reduce(rolling, datum, item);

      collection[key] = result;
    }

  }
  return collection;
};

// things to iterate over each car
var mappings = {
  // return the delta (in days) between the first and last recorded timestamp
  numDays: function(data, name) {
    var timestamps = Object.keys(data);
    var first = new Date(+timestamps[0]).clearTime();
    var last = new Date(+timestamps.last()).clearTime();
    return (last - first) / Date.day;
  },
  // set a property on each car's object for the # of timestamps it has recorded
  // FIXME should be done in findCars.js?
  locations: function(car) {
    car.locations = Object.keys(car);
    car.locationsLength = car.locations.length;
    return car;
  },
  // first found timestamp
  start: function(car) {
    return car.locations != null ?
      +car.locations[0] : undefined;
  },
  // last found timestamp
  end: function(car) {
    return car.locations != null ?
      +car.locations.last() : undefined;
  }
};

var reductions = {
  numDays: function(cur, delta) {
    cur = cur || 0;
    if (delta > cur) cur = delta;
    return cur;
  },
  start: function(start, earliest) {
    return start == null ? earliest :
      earliest < start ? earliest : start;
  },
  end: function(end, latest) {
    return end == null ? latest :
      latest > end ? latest : end;
  }
};

var calculate = function() {
  return mapreduce(cars, mappings, reductions);
};
