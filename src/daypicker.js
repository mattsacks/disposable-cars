// setup the dayPicker
var DayPicker = function() {
  this.template = getTemplate('dayPicker');
  this.element = document.id('dayPicker');
  return this;
};

DayPicker.prototype.render = function() {
  var i = data.numDays;
  var days = [];
  var today = new Date().clearTime();

  while(i--) {
    days.push(new Date(today).decrement('day', i));
  }

  this.data = {
    // an index of days 
    days: days,

    dayText: function() {
      return Date.days[new Date(this).getDay()];
    }
  };

  render(this.element, this.template, this.data);
  return this;
};
