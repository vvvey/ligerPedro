function fixRoundOffError(toFix){
	toFix = Math.round((toFix * 100))/100;
	toFix = toFix.toString();
	if (toFix[toFix.indexOf(".")+2] == undefined && toFix[toFix.indexOf(".")] != undefined){
	   toFix = toFix.concat("0");
	}
	return parseFloat(toFix);
}

module.exports = {
	fixROE: fixRoundOffError
}