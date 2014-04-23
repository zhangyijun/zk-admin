"use strict";
var express = require('express');
require('express-namespace');
var path=require('path');
var fs=require('fs');
var util=require('util');

var config = require('./config.json');
var ZooKeeper = require('./zk').ZooKeeper;
var zk = new ZooKeeper(config.zk);
zk.connect();
var app = express();

// process.on('uncaughtException', function (err) {
//   console.error('Caught exception: ' + err);
// });

// Configuration
app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.cookieParser());
    app.use(express.session({ secret: "zk-admin" }));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', function(req, res){
    res.redirect("/zk-admin/");
});

function getResolver(res) {
  return function(result){
    if (result.error) {
      return res.send(500, result);
    }
    return res.send(200, result);
  };
}

function tree(path, callback) {
  var names = path.split('/');
  var result = {};
  var last = result;
  function load(base) {
    base = (base === '/' ? base : base + '/')+names.shift();
    return zk.list(base).then(function(rs) {
      if (rs.error) {
        return callback(result);
      }
      rs.children.forEach(function(x) {
        last[x] = {};
      });

      var next = names[0];
      if (next) {
        last = last[next];
        load(base);
      }
      else {
        callback(result);
      }
    });
  }
  return load('');
}

app.namespace("/zk-admin",function(){

  //index
  app.get('/', function(req, res){
    var path = req.query.path || '';
    tree(path, function(tree) {
      //console.log(tree);
      res.render('index', {path: path, tree: tree});
    });
  });

  //display tree
  app.get('/tree', function(req, res){
    var path=req.query.path || "/";
    zk.list(path).then(getResolver(res));
  });

  app.get('/getData', function(req, res) {
    var path = req.query.path;
    zk.getData(path).then(getResolver(res));
  });

  app.post('/create', function(req, res) {
    var input = {
      path: req.param('path'),
      mode: req.param('mode'),
      data: req.param('data')
    };

    zk.create(input).then(getResolver(res));
  });

  app.post('/setData', function(req, res) {
    var path = req.param('path');
    var data = req.param('data') || '';
    zk.setData(path, data).then(getResolver(res));
  });

  app.post('/remove', function(req, res) {
    var path = req.param('path');
    zk.remove(path).then(getResolver(res));
  });

});

var port = config.port || 30000;
app.listen(port);
console.log("Express server listening on port %d", port);
