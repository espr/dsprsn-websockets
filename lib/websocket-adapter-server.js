var cookiejs = require('cookie')
var sockjs = require('sockjs')
var util = require('espr-util')
var dsprsn = require('dsprsn')

SOCKJS_URL = ""
SOCKJS_PREFIX = "/dsprsn"

/**
  @class WebsocketAdapterServer
  @constructor
**/
function WebsocketAdapterServer(options) {
  if (!options) throw new Error("WebsocketAdapterServer(options) requires options")
  if (!options.httpServer)
    throw new Error("WebsocketAdapterServer(options) requires options.httpServer")
  if (!options.log) options.log = function(){}
  this.options = options
}

/**
  @class WebsocketConnectedClient
  @constructor
**/
function WebsocketConnectedClient(options) {
  if (!options.conn) {
    throw new Error('WebsocketConnectedClient(options) requires options.conn')
  }
  this.conn = options.conn
  this.conn.on('data', this.onDataHandler.bind(this))
  this.conn.on('close',function(){})
}

util.extends(WebsocketAdapterServer, util.Events)
util.extends(WebsocketConnectedClient, util.Events)

WebsocketAdapterServer.prototype.listen = function(cb) {
  var inst = this
  this.sockjsServer = sockjs.listen(inst.options.httpServer, {
    prefix: SOCKJS_PREFIX,
    sockjs_url: SOCKJS_URL,
    log: inst.options.log
  })
  this.sockjsServer.on('connection', function(conn) {
    var cli = new WebsocketConnectedClient({conn: conn})

    // parse cookies
    try {
      cli.cookies = cookiejs.parse(conn._session.recv.ws.request.headers.cookie);
    } catch(e) {}

    inst.emit('new', cli)
  })
  if (cb) cb(inst)
}
WebsocketAdapterServer.prototype.close = function(cb) {
  // this.server.close(cb)
  if (cb) cb()
}

WebsocketConnectedClient.prototype.send = function() {
  var args = Array.prototype.slice.call(arguments,0)
  process.nextTick(function(){
    this.conn.write(JSON.stringify(args))
  }.bind(this))
}
WebsocketConnectedClient.prototype.onDataHandler = function(arg_str) {
  process.nextTick(function(){
    var args = JSON.parse(arg_str)
    args.unshift('')
    this.emit.apply(this,args)
  }.bind(this))
}

module.exports = WebsocketAdapterServer
