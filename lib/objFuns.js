var pool = require('./pool-config');

async function toObj(masterObj, eventObj, id) {

    //Query from for array on that row
    var keysOpt = ["person1", "person2", "person3", "person4", "person5", "person6"]; //Don't change the partner
    var errorCount = 0;  //counter where the index of the array
    var forKeyObj; // String for object name

    //Validation for the array to make sure there something if not the program will crash
    //Not sure if it works
    if(!masterObj){
      console.log("No object in the column 'approve_info'.");
      return;
    }

    var keysVal = Object.keys(masterObj.body); //Array for the KEYS in the "masterObj"
    for(var i = 0; i < keysVal.length; i++){
      if(keysVal[i] == keysOpt[i]){
        errorCount++;
      } 
    }
    
    forKeyObj = keysOpt[errorCount]; //asign the keys
    masterObj.body[forKeyObj] = eventObj; //combining the objects
    return masterObj;
}

async function ifThere(array, expectation) {
    var counter = 0;

    if(array) {
        for(var i =0; i < array.length; i++){
            if(array == expectation){
                counter++;
            }
        }
    }else {
        return "Incorrect array";
    }
    return counter;
}

async function eventCounter(masterObj) {
    //"masterObj" == ..approve_info
    var events = {
        "approve" : 0,
        "disapprove" : 0
    };

    if(!masterObj){
        return "No objects inputs, eventCounter";
    }

    var keysVal = Object.keys(masterObj.body);

    for(var z = 0; z < keysVal.length; z++){
        if(`${masterObj.body[keysVal[z]].status}` == 'approve'){
            events.approve += 1;      
        }else if(`${masterObj.body[keysVal[z]].status}` == 'disapprove'){
            events.disapprove += 1;      
        }
    }
    return events;
}


module.exports = {
    toObj : toObj,
    ifThere : ifThere,
    eventCounter : eventCounter
}