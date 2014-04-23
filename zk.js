"use strict";

var zookeeper = require('node-zookeeper-client');
//var Promise = require('promise');
//console.log(Promise);
var defer = require("node-promise").defer;
//console.log(defer);
var CreateMode = {
  "PERSISTENT": "1",
  "PERSISTENT_SEQUENTIAL": "2",
  "EPHEMERAL": "3",
  "EPHEMERAL_SEQUENTIAL": "4",
};

exports.CreateMode = CreateMode;
var InMapping = {}, OutMapping = {};
for (var name in CreateMode) {
  InMapping[CreateMode[name]] = zookeeper.CreateMode[name];
  OutMapping[zookeeper.CreateMode[name]] = CreateMode[name];
}

// myCode -> ZooKeeper
function getMode(myCode) {
  return InMapping[myCode];
}

// ZooKeeper -> myCode
function valueOf(innerValue) {
  return OutMapping[innerValue];
}

function statValue(stat) {
  var rs = {};
  function cp(key) {
    rs[key] = stat[key];
  }
  function getLong(key) {
    var buf = stat[key];
    if (!buf) return ;
    rs[key] = (buf.readUInt32BE(0) << 8) + buf.readUInt32BE(4);
  }
  function hex(key) {
    if (stat[key]) {
      rs[key] = stat[key].toString('hex');
    }
  }
  ['specification', 'version', 'cversion', 'aversion', 'dataLength', 'numChildren'].forEach(cp);
  ['czxid', 'mzxid', 'pzxid', 'ephemeralOwner', 'ctime', 'mtime'].forEach(getLong);
  return rs;
}

function ZooKeeper(hosts) {
  this.client = zookeeper.createClient(hosts, {retries: 3});
}

exports.ZooKeeper = ZooKeeper;

ZooKeeper.prototype = {
  connect: function() {
    this.client.connect();
  },
  close: function() {
    this.connected = false;
    this.close();
  },
  getData: function(path) {
    var df = defer();
    this.client.getData(path || '/',
      function(error, data, stat) {
        var dataString = data ? data.toString() : '';
        df.resolve({path: path, error: error, data: dataString, stat: statValue(stat)});
      }
    );
    return df.promise;
  },
  setData: function(path, data) {
    console.log('setData', path, data);
    var df = defer();
    this.client.setData(path || '/', new Buffer(data),
      function(error, stat) {
        df.resolve({path: path, error: error, data: data, stat: statValue(stat)});
      }
    );
    return df.promise;
  },
  create: function(input) {
    console.log('create ZNode', input);
    var path = input.path;
    var mode = valueOf(input.mode || CreateMode.PERSISTENT);
    var data = new Buffer(input.data || '');
    // todo acl
    var df = defer();
    this.client.create(path, data, mode, function(error, stat) {
      if (error) input.error = error;
      input.stat = statValue(stat);
      df.resolve(input);
    });
    return df.promise;
  },
  remove: function(path) {
    var df = defer();
    this.client.remove(path, function(error) {
      df.resolve({path: path, error: error});
    });
    return df.promise;
  },
  list: function(path) {
    var df = defer();
    var self = this;
    this.client.getChildren(path,
      function(error, children, stat) {
        df.resolve({path: path, error: error, children: children, stat: statValue(stat)});
      }
    );
    return df.promise;
  }
};
