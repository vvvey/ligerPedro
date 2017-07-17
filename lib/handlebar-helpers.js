var exphbs = require('express-handlebars');
const moment = require('moment-timezone')

var hbs = exphbs.create({
  defaultLayout: 'main',
  // Specify helpers which are only registered on this instance.
  helpers: {
    ifCond: function(v1, v2, options) {
      if (v1 == v2) {
        return options.fn(this);
      } 
      return options.inverse(this);
    },

    forCond: function(x, y, z){

      for(var i = 1; i < x; i++){
        if (z[i] == y) {
          return options.fn(this);
        } 
        return options.inverse(this)
      }
    },

    finding: function(arr, val, options){
      
      if(arr){
        for (var i = 0; i < arr.length; i++) {
          if(arr[i] == val){
            return options.fn(this);
          }
        }  
      }
      return options.inverse(this);
    },

//select array_upper ( column_name, 1 ) from table_name_here;
    ifCondA: function(v1, operator, v2, options){
      switch (operator) {
        case '==':
              return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===':
            return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '!=':
            return (v1 != v2) ? options.fn(this) : options.inverse(this);
        case '!==':
            return (v1 !== v2) ? options.fn(this) : options.inverse(this);
        case '<':
            return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
            return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
            return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '&&':
            return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case '||':
            return (v1 || v2) ? options.fn(this) : options.inverse(this);
        default:
            return options.inverse(this);
      }
    },
    upperCase: function(text) { 
      if (text == null) {
        return text;
      }

      if (typeof text == 'string') {
         return text.toUpperCase();
       } else {
        return text;
       }
     
    },
    firstLetter: function(username) {
      return username[0]
    },
    formatDate: function(date, format) {
      if (date == null) {
        return;
      }

      var newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
      var offset = date.getTimezoneOffset() / 60;
      var hours = date.getHours();
      newDate.setHours(hours - offset);

      newDate = moment(newDate);
      var TODAY = moment();
      if (format == 'short') {
        if (newDate.isSame(TODAY, 'd')) {
          return newDate.format("h:mm A")
        } else {
          return newDate.format("MMMM DD, YYYY"); 
        }
      } else if (format = 'standard') {
        return newDate.format('ddd MMM DD YYYY h:mm A');
      }
      
      
      //return moment().format();
    },

    dateFormat: function(date) {
      if (date == null) {
        return;
      }
      var newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
      var offset = date.getTimezoneOffset() / 60;
      var hours = date.getHours();
      newDate.setHours(hours - offset);

      var seconds = Math.floor((new Date() - newDate) / 1000);

      var interval = Math.floor(seconds / 86400); //1 day equal 86400
      function pad(s) {
        return (s < 10) ? '0' + s : s;
      } //change the 1 digit number to 2 digit numbers like 1 --> 01
      var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      if (interval >= 2) { //more than two days
        return [pad(newDate.getDate()), monthNames[newDate.getMonth()]+',', newDate.getFullYear()].join(' '); //date format seperated by .
      }
      

      function plural(number, text) {
        if (number == 1) {
          return number + ' ' + text + ' ago';
        } else {
          return number + ' ' + text + 's ago';
        }
      }

      if (interval < 0) {
        return [pad(newDate.getDate()), monthNames[newDate.getMonth()]+',', newDate.getFullYear()].join(' '); //date format seperated by .
      }

      if (interval >= 1) {
        return plural(interval, 'day')
      }
      interval = Math.floor(seconds / 3600); //1 hour equal 3600
      if (interval >= 1) {
        return plural(interval, 'hour')
      }
      interval = Math.floor(seconds / 60); //1 minutes equal 60
      if (interval >= 1) {
        return plural(interval, 'minute')
      }
      return plural(Math.floor(seconds), "second");
    }
  }
});

module.exports = hbs;