http = require('http')
express = require('express')
DsprsnWebsockets = require('../index.js')

var REQ = {'msg':'req_from_client'}
var RSP = {'msg':'rsp_from_server'}

function AttachWebsocketAdapter(server) {
  var adapter = new DsprsnWebsockets.Adapter.Server({
    httpServer: server
  })
  adapter.on('new', function(conn){
    conn.on(function(req){
      if (req && req.msg===REQ.msg) {
        conn.send(RSP)
      } else {
        throw new Error("incorrect req "+JSON.stringify(req))
      }
    })
  })
  adapter.listen()
}

function StartExpressServer(port, callback) {
  var app = express()
  app.use(express.bodyParser())
  var server = TestServer.instance = http.createServer(app)
  AttachWebsocketAdapter(server)
  server.listen(port, '127.0.0.1', function(){
    if ('function'===typeof callback) { callback(app) }
  })
}

function StopServer(callback) {
  TestServer.instance.close(function(){
    if ('function'===typeof callback) { callback() }
  })
}

var TestServer = module.exports = {
  create: StartExpressServer,
  close: StopServer
}
