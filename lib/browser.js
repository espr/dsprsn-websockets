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
