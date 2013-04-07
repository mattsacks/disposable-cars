// setup the dayPicker
var DayPicker = function() {
  this.template = getTemplate('dayPicker');
  this.element = document.id('dayPicker');

  // default to the last day (today) being active
  this.activeIndex = data.numDays-1;

  return this;
};

DayPicker.prototype.render = function() {
  var thiz = this;
  var i = data.numDays;
  var days = [];
  var today = new Date().clearTime();

  while(i--) {
    days.push(new Date(today).decrement('day', i));
  }

  this.data = {
    // an index of days 
    days: days,

    // return the day of the week text
    dayText: function() {
      return Date.days[new Date(this).getDay()];
    },

    // return an active class for the day if it's the current selected day
    dayActive: function() {
      return thiz.data.days[thiz.activeIndex] == +this ?
        'active' : '';
    }
  };

  render(this.element, this.template, this.data);
  return this;
};
