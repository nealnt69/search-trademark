var express = require("express");
var router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index");
});
router.get("/key", function (req, res, next) {
  res.render("key");
});

module.exports = router;
