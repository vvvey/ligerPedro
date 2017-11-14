function isRole() { 
  var args = Array.prototype.slice.call(arguments); 
  return function (req, res, next) { 
    var userRole = req.user.role; 
    var isUserRoleValid = false; 
 
    for (var i = 0; i < args.length; i++) { 
      if (args[i] == userRole) { 
        isUserRoleValid = true; 
        break 
      } 
    } 
 
    if (isUserRoleValid) { 
      next(); 
    } else { 
      return res.status(404).render('home'); 
    } 
 
  } 
} 
 
module.exports = { 
  isRole: isRole 
} 