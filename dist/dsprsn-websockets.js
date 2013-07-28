;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
WebsocketAdapterClient = require('./websocket-adapter-client.js')

var dsprsn = module.exports = require('dsprsn')
var DsprsnWebsockets = module.exports = {
  Adapter: {
    Client: WebsocketAdapterClient
  }
}

if ('undefined'!==typeof window) {
  if (window.dsprsn) {
    throw new Error("a global dsprsn reference already exists")
  } else { window.dsprsn = dsprsn }
  if (window.DsprsnWebsockets) {
    throw new Error("a global DsprsnWebsockets reference already exists")
  } else { window.DsprsnWebsockets = DsprsnWebsockets }
}

},{"./websocket-adapter-client.js":2,"dsprsn":4}],2:[function(require,module,exports){
var util = require('espr-util')

SOCKJS_PREFIX = "/dsprsn"

/**
  @class WebsocketAdapterClient
  @constructor
**/
function WebsocketAdapterClient(options) {
  var inst = this
  if (!options) options = {}
  if (!options.url) options.url = SOCKJS_PREFIX
  else              options.url += SOCKJS_PREFIX
  if (options.log)  this._log = options.log
  else              this._log = function(){}
  this.options = options

  this._buffer = []
  this._conn = new SockJS(options.url)
  this._conn.onopen = function(){
    inst._log(options.url+" :: open")
    inst._buffer.forEach(function(args){
      inst._conn.send(JSON.stringify(args))
    })
    inst._buffer = []
  }
  this._conn.onclose = function(){
    inst._log(options.url+" :: close")
  }
  this._conn.onmessage = function(evnt){
    if (evnt.type!=='message') throw new Error('unknown message event type: '+evnt.type)
    inst.onDataHandler(evnt.data)
  }
}

util.extends(WebsocketAdapterClient, util.Events)

WebsocketAdapterClient.prototype.send = function() {
  var inst = this
  var args = Array.prototype.slice.call(arguments,0)
  setTimeout(function(){
    if (inst._conn.readyState===1) { // open
      inst._conn.send(JSON.stringify(args))
    } else {
      inst._buffer.push(args)
    }
  }.bind(this),0)
}
WebsocketAdapterClient.prototype.onDataHandler = function(arg_str) {
  var args = JSON.parse(arg_str)
  args.unshift('')
  this.emit.apply(this,args)
}
WebsocketAdapterClient.prototype.end = function() {
  setTimeout(function(){
    // this._conn.end()
  }.bind(this),0)
}

module.exports = WebsocketAdapterClient
},{"espr-util":14}],3:[function(require,module,exports){
exports.spawn = function () {};
exports.exec = function () {};

},{}],4:[function(require,module,exports){
module.exports = require('./lib/dsprsn.js')

},{"./lib/dsprsn.js":6}],5:[function(require,module,exports){
var util = require('espr-util')

/**
  @class AdapterClient
  @constructor
**/
function AdapterClient(options) {
  if (!options.server) {
    throw new Error('AdapterClient(options) requires options.server')
  }
  this._conn = options.server.connect(this)
}

/**
  @class AdapterServer
  @constructor
**/
function AdapterServer() {
}

/**
  @class ConnectedClient
  @constructor
**/
function ConnectedClient(options) {
  if (!options.client) {
    throw new Error('ConnectedClient(options) requires options.client')
  }
  this._client = options.client
}

util.extends(AdapterClient, util.Events)
util.extends(AdapterServer, util.Events)
util.extends(ConnectedClient, util.Events)

AdapterClient.prototype.send = function() {
  var args = Array.prototype.slice.call(arguments, 0)
  args.unshift('')
  setTimeout(function(){
    this._conn.emit.apply(this._conn, args)
  }.bind(this), 0)
}

AdapterServer.prototype.connect = function(client){
  var conn = new ConnectedClient({client: client})
  setTimeout(function(){
    this.emit('new',conn)
  }.bind(this), 0)
  return conn
}


ConnectedClient.prototype.send = function() {
  var args = Array.prototype.slice.call(arguments, 0)
  args.unshift('')
  setTimeout(function(){
    this._client.emit.apply(this._client, args)
  }.bind(this), 0)
}


/**
  Adapters wrap transports for communication between clients and servers.

  @class Adapter
  @static
**/
var Adapter = module.exports = {
  Client: AdapterClient,
  Server: AdapterServer
}
},{"espr-util":10}],6:[function(require,module,exports){
module.exports = {
  Adapter: require('./adapters/adapter.js'),
  Router: require('./rpc/router.js'),
  RpcClient: require('./rpc/client.js'),
  RpcServer: require('./rpc/server.js'),
  RpcChannel: require('./rpc/server.js').Channel
}

},{"./adapters/adapter.js":5,"./rpc/client.js":7,"./rpc/router.js":8,"./rpc/server.js":9}],7:[function(require,module,exports){
var util = require('espr-util')
var superRareId = require('super-rare-id')
var Adapter = require('../adapters/adapter.js')

/**
  @class RpcClient
  @constructor
**/
function RpcClient(options) {
  if (!options) throw new Error("options required")
  if (!options.adapter) throw new Error("options.adapter required")
  this._adapter = options.adapter
  this._adapter.on(this.handle.bind(this))
  this._requestChannels = {}
}

/**
  @class RpcClientChannel
  @constructor
**/
function RpcClientChannel(options) {
  if (!options) throw new Error("options required")
  if (!options.client) throw new Error("options.client required")
  this.client = options.client
  this._deferred = new util.Deferred()
  this._init = new util.Deferred()
  this.then = this._deferred.promise.then.bind(this._deferred)
  this.done = this._deferred.promise.done.bind(this._deferred)
}

util.extends(RpcClient, util.Events)
util.extends(RpcClientChannel, util.Events)

RpcClient.prototype.send = function() {
  var emitArgs = Array.prototype.slice.call(arguments, 0)
  var meta = {}
  meta.rpc_req_id = superRareId()
  emitArgs.unshift(meta)
  this._adapter.send.apply(this._adapter, emitArgs)
  this._requestChannels[meta.rpc_req_id] = new RpcClientChannel({client: this})
  return this._requestChannels[meta.rpc_req_id]
}

RpcClient.prototype.handle = function(meta) {
  var args = Array.prototype.slice.call(arguments, 1)
  var channel = this._requestChannels[meta.rpc_req_id]
  if (!channel) {
    throw new Error("channel "+meta.rpc_req_id+" not found for response")
  }
  if (meta.inited) {
    channel._init.fulfill(meta)
  } else if (meta.resolved) {
    args.unshift(!!meta.fulfilled)
    channel._deferred.resolve.apply(channel._deferred, args)
    delete this._requestChannels[meta.rpc_req_id]
  } else {
    args.unshift(meta.event_name || '')
    channel.emit.apply(channel, args)
  }
}

RpcClientChannel.prototype.send = function() {
  var emitArgs = Array.prototype.slice.call(arguments, 0)
  var channel = new RpcClientChannel({client: this})
  this._init.promise.done(function(channel_meta){
    var meta = {}
    meta.rpc_req_id = superRareId()
    meta.rpc_channel_id = channel_meta.rpc_channel_id
    emitArgs.unshift(meta)
    this.client._requestChannels[meta.rpc_req_id] = channel
    this.client._adapter.send.apply(this.client._adapter, emitArgs)
  }.bind(this))
  return channel
}

module.exports = RpcClient
},{"../adapters/adapter.js":5,"espr-util":10,"super-rare-id":13}],8:[function(require,module,exports){
util = require('espr-util');

/**
  Different than events, a router calls first most specifically matched
  subscriber.

  @class Router
  @constructor
**/
function Router() {
  var inst = this
  this.handle = function(){
    inst.providedThis = this
    Router.prototype.handle.apply(inst,arguments)
  }
};

/**
  Adds listener to be called when the pattern matches.

  @param {String} pattern     specified like /path/with/:param
  @param {Function} listener  the subscriber
  @return `this`
**/
Router.prototype.on = function(pattern, listener) {
  if (!this._routeTree) { this._routeTree = {}; }

  // clean pattern and get parts
  if (!listener && (typeof pattern == 'function')) { listener = pattern; pattern = "/"; }
  pattern = "/"+pattern.replace(/\/+$/,"").replace(/^\/+/,""); // strip trailing slash but ensure leading slash
  var parts = pattern.split("/").slice(1); // split, slicing the first since we ensured a leading slash

  // follows a path down the pattern tree, creating nodes which do not yet exist
  var node = this._routeTree;
  for (var i = 0; i < parts.length; ++i) {
    var part = parts[i];
    if (part.length <= 0) { // no pattern or blank pattern
      continue;
    } else if (part.charAt(0)==':') { // param matcher
      var paramName = part.substr(1);
      if (/^[a-zA-Z0-9_]+$/.test(paramName)) {
        if (!node[":"]) { node[":"] = {}; }
        if (!node[":"][paramName]) { node[":"][paramName] = {}; }
        node = node[":"][paramName];
        continue;
      } else {
        throw new Error("invalid param matcher "+part);
      }
    } else { // normal pattern match
      if (/^[a-zA-Z0-9_]+$/.test(part)) {
        if (!node[part]) { node[part] = {}; }
        node = node[part];
        continue;
      } else {
        throw new Error("invalid pattern part "+part);
      }
    }
  }

  // place our listener on the / node of the deepest matched pattern
  if (!node["/"]) { node["/"] = []; }
  node["/"].push(listener);
  return this;
};

/**
  Establishes a method called before any listeners. Any paths
  beginning with the requested path will be matched.

  @return `this`
**/
Router.prototype.before = function(pattern, listener) {
  if (!this._beforeTree) { this._beforeTree = {}; }

  if ('function'===typeof pattern) {
    listener = pattern
    pattern = "/"
  }
  pattern = "/"+pattern.replace(/\/+$/,"").replace(/^\/+/,"")
  var parts = pattern.split("/").slice(1)

  if (parts[0]==='') {
    if (!this._beforeTree['/']) this._beforeTree['/']=[]
    this._beforeTree['/'].push(listener)
  } else {
    var node = this._beforeTree
    // traversed down beforeTree for each parts,
    // creating nodes which do not exist
    for (var i = 0; i < parts.length; ++i) {
      if (!node[parts[i]]) {
        node[parts[i]] = {'/':[]}
      }
      node = node[parts[i]]
    }
    node['/'].push(listener)
  }
  return this
}

/**
  Handles an incoming event.

  @param {String} route  parameter to test patterns against
  @param ...             arguments passed to called listener.
  @return `this`
**/
Router.prototype.handle = function(route) {
  if ('string'!==typeof route) {
    throw new Error("dsprsn.Router#handle expected string for first parameter but got "+route)
  }

  // save any args beyond the first one
  var args = Array.prototype.slice.call(arguments,1);

  // param variables matched
  var params = {};

  // injected instance
  var inst = this.providedThis;

  // clean route and get parts
  route = "/"+route.replace(/\/+$/,"").replace(/^\/+/,""); // trip trailing slash but ensure leading slash
  var parts = route.split("/").slice(1); // split, slicing the first off since we ensured a leading slash

  // execute any before filters
  var beforePromise = util.Deferred.fulfilled()
  if (this._beforeTree) {
    var bnode = this._beforeTree
    if (bnode['/']&&bnode['/'].length>0) {
      bnode['/'].forEach(function(listener){
        var result = listener.apply(inst, args)
        // if promise returned, push onto deferred chain
        if (result&&'function'===typeof result.then) {
          beforePromise = result.then(beforePromise)
        }
      })
    }
    for (var bi = 0; bi < parts.length; ++bi) {
      if (bnode[parts[bi]]) {
        bnode = bnode[parts[bi]]
        if (bnode&&bnode['/'].length>0) {
          bnode['/'].forEach(function(listener){
            var result = listener.apply(inst, args)
            // if promise returned, push onto deferred chain
            if (result&&'function'===typeof result.then) {
              beforePromise = result.then(beforePromise)
            }
          })
        }
      } else {
        bnode = null
        break
      }
    }
  }

  // follows a path down the route tree, matching the first applicable path
  var node = this._routeTree;
  var i = 0;
  for (; i < parts.length; ++i) {
    var part = parts[i];
    if (part.length <= 0) { // no route or blank route
      continue;
    } else if (node[part]) { // normal route match
      node = node[part];
      continue;
    } else if (node[":"]) { // if there are param matchers
      var firstNode = null;
      for (var key in node[":"]) {
        if ({}.hasOwnProperty.call(node[":"],key)){
          if (firstNode==null) { firstNode = node[":"][key]; }
          params[key] = part; // attach value to param hash
        }
      }
      if (firstNode) {
        node = firstNode;
        continue;
      } else {
        throw new Error("param matcher fake out?!")
      }
    } else {
      break;
    }
  }

  // todo: probably shouldn't indiscriminantly try to attach properties to the first param
  if (!args[0]) { args[0] = {}; }
  args[0].route = route;
  args[0].params = params;
  util.merge(args[0],params)

  // call any listeners on "/", if there is no slash then route error?
  var resultPromise;
  if (node["/"]) {
    var resultPromise = beforePromise.then(function(){
      var result;
      node["/"].forEach(function(listener){
        // call handle if the listener has it (such as a Router instance)
        if (listener.handle) {
          args.unshift(parts.slice(i).join('/'));
          result = listener.handle.apply(inst,args);
        } else {
          result = listener.apply(inst, args);
        }
      });
      // return result;
    })
  } else {
    console.info(this)
    throw new Error("could not route: "+route);
  }

  // save successful route match
  this._currentRoute = route;

  return resultPromise;
};

module.exports = Router;
},{"espr-util":10}],9:[function(require,module,exports){
var util = require('espr-util')
var superRareId = require('super-rare-id')
var Adapter = require('../adapters/adapter.js')
var RpcClient = require('./client.js')

/**
  @class RpcServer
  @constructor
**/
function RpcServer(options) {
  if (options && options.adapter) {
    this._adapter = options.adapter
  } else {
    this._adapter = new Adapter.Server()
  }
}

/**
  @class RpcChannel
  @constructor
**/
function RpcChannel(options) {
  RpcChannel.__super__.constructor.apply(this, arguments)
  if (!options) throw new Error('RpcChannel requires options')
  if (!options.conn) throw new Error('RpcChannel requires options.conn')
  this.id = superRareId()
  this._conn = options.conn
  var _deferred = new util.Deferred()
  this.fulfill = _deferred.fulfill
  this.resolve = _deferred.fulfill
  this.reject = _deferred.reject
  this._promise = _deferred.promise
}

util.extends(RpcServer, util.Events)
util.extends(RpcChannel, util.Events)

RpcServer.prototype.listen = function() {
  this._adapter.on('new', this.setupConnection.bind(this))
  if ('function'===typeof this._adapter.listen)
    this._adapter.listen()
}

RpcServer.prototype.setupConnection = function(conn) {
  conn._channels = {_closed:{}}
  conn.on(function(req_meta){
    var channel

    var emitArgs = Array.prototype.slice.call(arguments, 1)
    if (req_meta && req_meta.rpc_channel_id) {
      var parentChannel
      if (parentChannel = conn._channels[req_meta.rpc_channel_id]) {
        channel = new RpcChannel({conn:conn})
        if (parentChannel._eventSubscribers&&parentChannel._eventSubscribers.hasOwnProperty('')) {
          parentChannel._eventSubscribers[''].forEach(function(fn){
            fn.apply(channel, emitArgs)
          });
        }
      } else {
        if (conn._channels._closed[req_meta.rpc_channel_id]) {
          throw new Error("request emitted over closed channel "+req_meta.rpc_channel_id)
        } else {
          throw new Error("bad channel id "+req_meta.rpc_channel_id)
        }
      }
    } else {
      channel = new RpcChannel({conn:conn})
      if (this._eventSubscribers&&this._eventSubscribers.hasOwnProperty('')) {
        this._eventSubscribers[''].forEach(function(fn){
          fn.apply(channel, emitArgs)
        });
      }
    }

    // if (result instanceof RpcChannel) {
    //   // todo resolve new channel
    //   // channel = result
    // } else if (result && 'function'===typeof result.then) {
    //   if ('function'===typeof result.done) {
    //     result.done(channel.resolve, channel.reject)
    //   } else {
    //     result.then(channel.resolve, channel.reject)
    //   }
    // } else {
    //   channel.resolve(result)
    // }

    conn._channels[channel.id] = channel
    channel.attach(req_meta)
    conn.send.call(conn, {
      inited: true,
      rpc_req_id: req_meta.rpc_req_id,
      rpc_channel_id: channel.id
    })
  }.bind(this))
}

RpcServer.prototype.client = function() {
  return new RpcClient({
    adapter: new Adapter.Client({server: this._adapter})
  })
}

RpcChannel.prototype.send = function() {
  if (!this._conn) {
    if (!this._buffer) {
      this._buffer = []
    }
    this._buffer.push(arguments)
  } else {
    var emitArgs = Array.prototype.slice.call(arguments, 0)
    emitArgs.unshift(this._meta)
    this._conn.send.apply(this._conn, emitArgs)
  }
}

RpcChannel.prototype.listenTo = function(obj, eventName) {
  var inst = this
  var listener = function(){
    var args = Array.prototype.slice(0)
    args.unshift(eventName)
    inst.send.apply(inst,args)
  }
  var unsubFn = function(){
    obj.off(eventName, listener)
  }
  // this._promise.then(unsubFn,unsubFn)
  obj.on(eventName, listener)
  return this
}

RpcChannel.prototype.attach = function(meta) {
  this._meta = meta
  // empty buffer
  if (this._buffer) {
    this._buffer.forEach(function(emitArgs){
      emitArgs.unshift(this._meta)
      this._conn.send.apply(this._conn, emitArgs)
    })
  }
  delete this._buffer
  // listen for promise completion
  this._promise.done(function(){
    this._meta.resolved = true
    this._meta.fulfilled = true
    this.send.apply(this, arguments)
    this._conn._channels._closed[this.id] = true
    delete this._conn._channels[this.id]
  }.bind(this),
  function(){
    this._meta.resolved = true
    this._meta.fulfilled = false
    this.send.apply(this, arguments)
    this._conn._channels._closed[this.id] = true
    delete this._conn._channels[this.id]
  }.bind(this))
}

RpcServer.Channel = RpcChannel
module.exports = RpcServer

},{"../adapters/adapter.js":5,"./client.js":7,"espr-util":10,"super-rare-id":13}],10:[function(require,module,exports){
var exec = require('child_process').exec

var util = module.exports = {}

util.Deferred = require('./lib/deferred.js')
util.Events = require('./lib/events.js')

util.sh = function(command, cb){
  var e = exec(command, function(error, strout, strerr){
    process.stdout.write(strout)
    process.stderr.write(strerr)
  })
  e.on('exit', function(code){
    if (code!==0) {
      console.error("exec exited with code #{code}")
    }
    if ('function'===typeof cb) {
      cb()
    }
  })
}

util.merge = function(obj) {
  Array.prototype.slice.call(arguments, 1).forEach(function(source) {
    if (source) {
      for (var prop in source) {
        obj[prop] = source[prop];
      }
    }
  });
  return obj;
};

util.extends = function(child, parent) {
  for (var key in parent) {
    if ({}.hasOwnProperty.call(parent, key)) child[key] = parent[key];
  }
  function ctor() {
    this.constructor = child;
  }
  ctor.prototype = parent.prototype;
  child.prototype = new ctor();
  child.__super__ = parent.prototype;
  return child;
};
},{"./lib/deferred.js":11,"./lib/events.js":12,"child_process":3}],11:[function(require,module,exports){
/**
  An promises/a compatable promise implementation
  based on https://github.com/ForbesLindesay/promises-a

  @class Deferred
  @constructor
**/

function Promise(deferred) {
  this.then = then.bind(deferred);
  this.valueOf = valueOf.bind(deferred);
  this.done = done.bind(deferred);
}

function Deferred() {
  this.resolved = false;
  this.fulfilled = false;
  this.fulfill = fulfill.bind(this);
  this.reject = reject.bind(this);
  this.val = undefined;
  this.waiting = [];
  this.running = false;
  this.promise = new Promise(this)
}

module.exports = Deferred;
Deferred.Promise = Promise;

Deferred.fulfilled = function(val){
  var deferred = new Deferred();
  deferred.fulfill(val);
  return deferred.promise;
};

Deferred.rejected = function(val){
  var deferred = new Deferred();
  deferred.reject(val);
  return deferred.promise;
};

Deferred.prototype.resolve = function resolve(success, value, options) {
  if (this.resolved) return;
  if (success && value && typeof value.then === 'function'
      && !(options&&(options.noresolve===true))) { // to force fulfilling value with #then
    value.then(this.fulfill.bind(this), this.reject.bind(this))
  } else {
    this.resolved = true
    this.fulfilled = success
    this.val = value
    __next.bind(this)()
  }
};

function fulfill(val) {
  this.resolve(true, val)
}
function reject(err) {
  this.resolve(false, err)
}

function valueOf() {
  return this.fulfilled ? this.val : this.promise;
}

function __next(){
  if (this.waiting.length) {
    this.running = true
    this.waiting.shift()()
  } else {
    this.running = false
  }
};

function then(cb, eb) {
  var _this = this;
  var def = new Deferred();
  var next = __next.bind(this);
  var handler = function() {
    var callback = _this.fulfilled ? cb : eb;
    if (typeof callback === 'function') {
      setTimeout(function(){
        var result;
        try {
          result = callback(_this.val);
        } catch (ex) {
          def.reject(ex);
          next();
        }
        def.fulfill(result);
        next();
      }, 0);
    } else if (_this.fulfilled) {
      def.fulfill(_this.val);
      next();
    } else {
      def.reject(_this.val);
      next();
    }
  }
  this.waiting.push(handler);
  if (_this.resolved && !_this.running) {
    next()
  }
  return def.promise
};

function done(cb, eb) {
  var p = this.promise; // support 'hot' promises
  if (cb || eb) {
    p = p.then(cb, eb)
  }
  p.then(null, function (reason) {
    setTimeout(function () {
      throw reason
    }, 0);
  })
};

},{}],12:[function(require,module,exports){
/**
  A small implementation of an Event manager. It does not
  require initialization via constructor.

  @class Events
  @constructor
**/
function Events() {
  this._eventSubscribers = {}
};

/**
  Subscribes to an event by key.

  @param {String} key   event key
  @param {Function} fn  subscriber
**/
Events.prototype.on = function(key, fn) {
  if (this._eventSubscribers===undefined) { this._eventSubscribers = {}; }
  if (typeof key === 'function') { fn = key; key = ""; }
  if (!this._eventSubscribers[key]) { this._eventSubscribers[key]=[]; }
  this._eventSubscribers[key].push(fn);
  return this;
};

/**
  Removes a subscriber.

  @param {String} key   event key
  @param {Function} fn  subscriber
**/
Events.prototype.off = function(key, fn) {
  if (this._eventSubscribers===undefined) { return; }
  if (this._eventSubscribers[key]===undefined) { return; }
  var removalIndex = this._eventSubscribers[key].indexOf(fn);
  if (removalIndex >= 0) {
    this._eventSubscribers[key].splice(removalIndex, 1);
  }
  return this;
};

/**
  Emits arguments to all subscribers.

  @param {String} key  event key
  @param ...  additional arguments provided to subscribers
  @return `this` with which the call is bound to
**/
Events.prototype.emit = function(key)  {
  if (this._eventSubscribers===undefined) { return; }
  var last_result
  if (this._eventSubscribers.hasOwnProperty(key)) {
    var emitArgs = Array.prototype.slice.call(arguments, 1);
    this._eventSubscribers[key].forEach(function(fn){
      last_result = fn.apply(this, emitArgs)
    });
  }
  return last_result;
};

module.exports = Events;

},{}],13:[function(require,module,exports){
// @see https://github.com/coolaj86/node-browser-compat/blob/master/btoa/index.js
if (typeof btoa !== 'function') {
  global.btoa = function btoa(str) {
    return new Buffer(str, 'binary').toString('base64');
  }
}
// @see http://stackoverflow.com/questions/9267899/arraybuffer-to-base64-encoded-string
function int8ArrToBase64(bytes) {
  var binary = ''
  for (var i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]&0xff)
  }
  return btoa(binary)
}

var _cntr = 0

/**
  generates a base64 string, consisting of
  6 bytes the current timestamp, 1 byte the
  value of a spinning counter, and 1 byte
  from Math.random

  @method superRareId
  @static
**/
function superRareId(){
  var b = new ArrayBuffer(8)
  b[7] = Math.floor(Math.random()*255);
  b[6] = (_cntr = (++_cntr)%256)
  var t = Date.now();
  b[5]=t&0xff;
  b[4]=t&0xff00>>8;
  b[3]=t&0xff0000>>16;
  b[2]=t&0xff000000>>24;
  var h=Math.floor(t/4294967296);
  b[1]=h&0xff;
  b[0]=h&0xff00>>8;
  return int8ArrToBase64(b)
}
module.exports = superRareId

/**
  generates an 8 byte random bitstring
  encoded as base64

  @method random
  @static
**/
superRareId.random = function(){
  var b = new ArrayBuffer(8)
  b[7] = Math.floor(Math.random()*255);
  b[6] = Math.floor(Math.random()*255);
  b[5] = Math.floor(Math.random()*255);
  b[4] = Math.floor(Math.random()*255);
  b[3] = Math.floor(Math.random()*255);
  b[2] = Math.floor(Math.random()*255);
  b[1] = Math.floor(Math.random()*255);
  b[0] = Math.floor(Math.random()*255);
  return int8ArrToBase64(b)
}

},{}],14:[function(require,module,exports){
var exec = require('child_process').exec

var util = module.exports = {}

util.Deferred = require('./lib/deferred.js')
util.Events = require('./lib/events.js')

util.sh = function(command, cb){
  var e = exec(command, function(error, strout, strerr){
    process.stdout.write(strout)
    process.stderr.write(strerr)
  })
  e.on('exit', function(code){
    if (code!==0) {
      console.error("exec exited with code #{code}")
    }
    if ('function'===typeof cb) {
      cb()
    }
  })
}

util.merge = function(obj) {
  Array.prototype.slice.call(arguments, 1).forEach(function(source) {
    if (source) {
      for (var prop in source) {
        obj[prop] = source[prop];
      }
    }
  });
  return obj;
};

util.extends = function(child, parent) {
  for (var key in parent) {
    if ({}.hasOwnProperty.call(parent, key)) child[key] = parent[key];
  }
  function ctor() {
    this.constructor = child;
  }
  ctor.prototype = parent.prototype;
  child.prototype = new ctor();
  child.__super__ = parent.prototype;
  return child;
};
},{"./lib/deferred.js":15,"./lib/events.js":16,"child_process":3}],15:[function(require,module,exports){
/**
  An promises/a compatable promise implementation
  based on https://github.com/ForbesLindesay/promises-a

  @class Deferred
  @constructor
**/

function Promise(deferred) {
  this.then = then.bind(deferred);
  this.valueOf = valueOf.bind(deferred);
  this.done = done.bind(deferred);
}

function Deferred() {
  this.resolved = false;
  this.fulfilled = false;
  this.fulfill = fulfill.bind(this);
  this.reject = reject.bind(this);
  this.val = undefined;
  this.waiting = [];
  this.running = false;
  this.promise = new Promise(this)
}

module.exports = Deferred;
Deferred.Promise = Promise;

Deferred.fulfilled = function(val){
  var deferred = new Deferred();
  deferred.fulfill(val);
  return deferred.promise;
};

Deferred.rejected = function(val){
  var deferred = new Deferred();
  deferred.reject(val);
  return deferred.promise;
};

Deferred.prototype.resolve = function resolve(success, value, options) {
  if (this.resolved) return;
  if (success && value && typeof value.then === 'function'
      && !(options&&(options.noresolve===true))) { // to force fulfilling value with #then
    value.then(this.fulfill.bind(this), this.reject.bind(this))
  } else {
    this.resolved = true
    this.fulfilled = success
    this.val = value
    __next.bind(this)()
  }
};

function fulfill(val) {
  this.resolve(true, val)
}
function reject(err) {
  this.resolve(false, err)
}

function valueOf() {
  return this.fulfilled ? this.val : this.promise;
}

function __next(){
  if (this.waiting.length) {
    this.running = true
    this.waiting.shift()()
  } else {
    this.running = false
  }
};

function then(cb, eb) {
  var _this = this;
  var def = new Deferred();
  var next = __next.bind(this);
  var handler = function() {
    var callback = _this.fulfilled ? cb : eb;
    if (typeof callback === 'function') {
      setTimeout(function(){
        var result;
        try {
          result = callback(_this.val);
        } catch (ex) {
          def.reject(ex);
          next();
        }
        def.fulfill(result);
        next();
      }, 0);
    } else if (_this.fulfilled) {
      def.fulfill(_this.val);
      next();
    } else {
      def.reject(_this.val);
      next();
    }
  }
  this.waiting.push(handler);
  if (_this.resolved && !_this.running) {
    next()
  }
  return def.promise
};

function done(cb, eb) {
  var p = this.promise; // support 'hot' promises
  if (cb || eb) {
    p = p.then(cb, eb)
  }
  p.then(null, function (reason) {
    setTimeout(function () {
      throw reason
    }, 0);
  })
};

},{}],16:[function(require,module,exports){
/**
  A small implementation of an Event manager. It does not
  require initialization via constructor.

  @class Events
  @constructor
**/
function Events() {
  this._eventSubscribers = {}
};

/**
  Subscribes to an event by key.

  @param {String} key   event key
  @param {Function} fn  subscriber
**/
Events.prototype.on = function(key, fn) {
  if (this._eventSubscribers===undefined) { this._eventSubscribers = {}; }
  if (typeof key === 'function') { fn = key; key = ""; }
  if (!this._eventSubscribers[key]) { this._eventSubscribers[key]=[]; }
  this._eventSubscribers[key].push(fn);
  return this;
};

/**
  Removes a subscriber.

  @param {String} key   event key
  @param {Function} fn  subscriber
**/
Events.prototype.off = function(key, fn) {
  if (this._eventSubscribers===undefined) { return; }
  if (this._eventSubscribers[key]===undefined) { return; }
  var removalIndex = this._eventSubscribers[key].indexOf(fn);
  if (removalIndex >= 0) {
    this._eventSubscribers[key].splice(removalIndex, 1);
  }
  return this;
};

/**
  Emits arguments to all subscribers.

  @param {String} key  event key
  @param ...  additional arguments provided to subscribers
  @return `this` with which the call is bound to
**/
Events.prototype.emit = function(key)  {
  if (this._eventSubscribers===undefined) { return; }
  var last_result
  if (this._eventSubscribers.hasOwnProperty(key)) {
    var emitArgs = Array.prototype.slice.call(arguments, 1);
    this._eventSubscribers[key].forEach(function(fn){
      last_result = fn.apply(this, emitArgs)
    });
  }
  return last_result;
};

module.exports = Events;

},{}]},{},[1])
;