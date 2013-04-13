// alias id = getElementById
document.id = document.getElementById;

// get the last element in an array
Array.prototype.last = function() {
  return this[this.length - 1];
};

// 24 hours in milliseconds
Date.day = 86400000;
// array of days of the week
Date.days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// set a date to midnight
Date.prototype.clearTime = function() {
  this.setMilliseconds(0);
  this.setSeconds(0);
  this.setMinutes(0);
  this.setHours(0);
  return this;
};

// decrease the Date {range} by {amount}
Date.prototype.decrement = function(range, amount) {
  var change = Date.day;
  if (range === 'week') change *= 7;
  // TODO moar ranges

  change *= amount;

  // return a date object, not the date time
  return new Date(this.setTime(+this - change));
};

// get a date at it's 10th minute interval
Date.prototype.getTenth = function() {
  var interval = Math.floor(this.getMinutes() / 10);
  var clone = new Date(this);
  clone.setMilliseconds(0);
  clone.setSeconds(0);
  clone.setMinutes(10 * interval);
  return clone;
};

// single-purpose utility of today's nth interval in 10-minutes
Date.nowsTenth = (function() {
  return new Date().getTenth();
})();


// return a Mustache function of the a template element's innerHTML
var getTemplate = function(id) {
  var templateElement = document.id(id + '-template');
  var templateString = templateElement.innerHTML.trim();
  return Mustache.compile(templateString);
};

// render a Mustache function
var render = function(element, template, data, partials) {
  element.innerHTML = template(data, partials);
  return element;
};

// throttles a function, from underscore.js
var throttle = function(func, wait) {
  var context, args, timeout, result;
  var previous = 0;
  var later = function() {
    previous = new Date;
    timeout = null;
    result = func.apply(context, args);
  };
  return function() {
    var now = new Date;
    var remaining = wait - (now - previous);
    context = this;
    args = arguments;
    if (remaining <= 0) {
      clearTimeout(timeout);
      timeout = null;
      previous = now;
      result = func.apply(context, args);
    } else if (!timeout) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };
};

// dbounce a function, from underscore.js
var debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };
