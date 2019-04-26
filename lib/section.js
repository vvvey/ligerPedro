function isSection(sectionList) {

  return function (req, res, next) {

    if (sectionList.indexOf(req.params.section) >= 0) {
      next();
    } else {
      next()
      // return res.status(404).render('notFound');
    }


  }
}

module.exports = {
  isSection: isSection
}
