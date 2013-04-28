// library functions and type modifications

// alias id = getElementById
document.id = document.getElementById;

// get the last element in an array
Array.prototype.last = function() {
  return this[this.length - 1];
};

// convert a Date to UTC time
Date.prototype.inUTC = function() {
  var offset = this.getTimezoneOffset();
  this.setTime(+this + (offset*60000));
  return this;
};

// convert a Date to Portland time
Date.prototype.inPortland = function() {
  this.inUTC();
  this.setHours(this.getHours() - 7);
  return this;
};

// 1 hour in milliseconds
Date.hour = 3600000;
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

// get a date at it's 10th minute interval
Date.prototype.getTenth = function() {
  var interval = Math.floor(this.getMinutes() / 10);
  var clone = new Date(this);
  clone.setMilliseconds(0);
  clone.setSeconds(0);
  clone.setMinutes(10 * interval);
  return clone;
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
