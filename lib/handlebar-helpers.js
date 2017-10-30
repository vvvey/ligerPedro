var exphbs = require('express-handlebars');
const moment = require('moment-timezone')

var hbs = exphbs.create({
  defaultLayout: 'main',
  // Specify helpers which are only registered on this instance.
  helpers: {
    readArr: function(arr, options){
      var result = '';
      var addO = function(number){
        if(number < 10){
          return "0" + String(number); 
        }
        return(number);
      }
      var month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
      var toDateMonth = function(dateZone){
        var today = new Date(dateZone);
        var date = today.getDate();
        var mon = today.getMonth(); 

        return String(month[mon]) + ", " + addO(date);
      }

      if(arr == null){
        return;
      }

      for(var i = 0; i < arr.length; i++) {
        result += options.fn({username: arr[i][0], budget: arr[i][1], date: arr[i][3]});
      }

      result += options.fn({picker: arr[0][0], time: toDateMonth(arr[0][3])});
      return result;
    },

    sorten: function(dataCollection, options){
      console.log(dataCollection);
      var resultColletion = []; 
      var time = [];
      var stc = new Array();

      var username = 0;
      var budget = 1;
      var id = 2; 
      var date = 3;     
      var info = '';
      function conDate(date) {
        return new Date(date).getTime();
      }

      if(dataCollection){        

        for (var constance = 0; constance < dataCollection.length; constance++) {
          if(time == 0){
            time.push(conDate(dataCollection[constance][date]));
          } else {
            var Isee = 0;
            for(var i = 0; i < time.length; i++){
              if(time[i] == conDate(dataCollection[constance][date])){
                Isee = 1; 
              }
            }
            if(Isee == 0){
              time.push(conDate(dataCollection[constance][date]));
            }
          }

          for (var varies = 0; varies < dataCollection.length; varies++) {  

            if (dataCollection[constance][username] === dataCollection[varies][username]) {
              if (resultColletion == 0) { 
                resultColletion.push(dataCollection[varies]);
              } else {
                var found = 0;
                for (var inner = 0; inner < resultColletion.length; inner++) {
                  if(resultColletion[inner][username] == dataCollection[varies][username] && 
                    conDate(resultColletion[inner][date]) == conDate(dataCollection[varies][date])){

                     if(resultColletion[inner][id] != dataCollection[varies][id]){

                      resultColletion[inner][budget] = parseFloat(resultColletion[inner][budget]) + parseFloat(dataCollection[varies][budget]);

                      dataCollection[varies][id] = resultColletion[inner][id]; // change the constance id
                     }

                    found  = 1; 
                  }          
                }
                if(found == 0){
                  resultColletion.push(dataCollection[varies]);
                }
              }
            }
          }
        }

        for(var i = 0; i < time.length; i++){
          stc.push([]);
          for(var k = 0; k < resultColletion.length; k++){
            if(time[i] === conDate(resultColletion[k][date])){
              stc[i].push(resultColletion[k]);
            }
          } 
        }
          info += options.fn({day1: stc[0], day2: stc[1], day3: stc[2], 
              day4: stc[3], day5: stc[4], day6: stc[5], day7: stc[6]});
      }else{
        return info += options.fn({noData: "There's no Exchange!"});
      }
      return info;
    },

    SUM: function(fNum, sNum) {
      var result =  parseInt(fNum) + parseInt(sNum);
      if(result == 0) {
        return result + " response";
      }else if (result == 1) {
        return result + " response";
      } else {
        return result + " responses";
      }
    },

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
    lowerCase: function(text) { 
      if (text == null) {
        return text;
      }

      if (typeof text == 'string') {
         return text.toLowerCase();
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
      } else if (format == 'standard') {
        return newDate.format('ddd MMM DD YYYY h:mm A');
      } else {
        return newDate.format(format);
      }
      
      
      //return moment().format();
    },
    isNowInExchangeTimeRange: function (date) {
      if (date == null) {
        return false;
      }

      var newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
      var offset = date.getTimezoneOffset() / 60;
      var hours = date.getHours();
      newDate.setHours(hours - offset);

      newDate = moment(newDate);
      var TODAY = moment();

      var startHour = moment(newDate)
      var endHour = moment(newDate)
      startHour.hours(16);
      endHour.hours(17);
      console.log(startHour)
      console.log(endHour)
      console.log(TODAY.isBetween(startHour, endHour))
      return TODAY.isBetween(startHour, endHour);
      
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