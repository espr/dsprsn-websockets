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