fs = require('fs')
path = require('path')
spawn = require('child_process').spawn
express = require('express')
CoffeeScript = require('coffee-script')
var TestServer = require('./test-server.js')

var TEST_SERVER_PORT_BASE = 12300
var TEST_SERVER_PORT = TEST_SERVER_PORT_BASE+Math.floor(Math.random()*100)

var TEST_PAGE_SOURCE = "                                        \
  <html>                                                      \n\
    <head>                                                    \n\
      <title>mocha tests</title>                              \n\
      <meta charset=\"utf-8\">                                \n\
      <link rel=\"stylesheet\" href=\"mocha.css\" />          \n\
    </head>                                                   \n\
    <body>                                                    \n\
      <div id=\"mocha\"></div>                                \n\
      <script src=\"mocha.js\"></script>                      \n\
      <script src=\"chai.js\"></script>                       \n\
      <script src=\"sockjs.js\"></script>                     \n\
      <script>                                                \n\
        mocha.ui('bdd');                                      \n\
        mocha.reporter('html');                               \n\
        assert = chai.assert;                                 \n\
      </script>                                               \n\
      <script src=\"compiled.js\"></script>                   \n\
      <script src=\"tests.js\"></script>                      \n\
      <script>                                                \n\
        if (window.mochaPhantomJS) { mochaPhantomJS.run(); }  \n\
        else { mocha.run(); }                                 \n\
      </script>                                               \n\
    </body>                                                   \n\
  </html>"

function makeHttpResponder(str, opts) {
  return function(req,res){
    if (opts && opts.content_type) {
      res.set({'Content-Type': opts.content_type})
    } else {
      res.set({'Content-Type': 'text/html'})
    }
    res.end(str)
  }
}

function makeHttpResolver(str, opts) {
  return function(req,res){
    if (opts && opts.content_type) {
      res.set({'Content-Type': opts.content_type})
    } else {
      res.set({'Content-Type': 'text/html'})
    }
    res.end(str)
  }
}

function CompileSource(src, callback) {
  var cmd = path.resolve(__dirname,'../node_modules/.bin/browserify')
  k = spawn(cmd,['--dg','false',src])
  var script_buff = ""
  k.on('error',function(e){console.error(e.toString())})
  k.stdout.on('data',function(chnk){script_buff += chnk.toString()})
  k.stderr.on('data',function(e){console.error(e.toString())})
  k.on('close',function(){
    if ('function'===typeof callback){ callback(script_buff) }
  })
}

function CompileTests(callback) {
  var src = ""
  fs.readdirSync(path.resolve(__dirname)).forEach(function(filename){
    if (/_spec.(?:js)$/.test(filename)) {
      src += fs.readFileSync(path.resolve(__dirname, filename)).toString()
    } else if (/_spec.(?:coffee)$/.test(filename)) {
      src += CoffeeScript.compile(
        fs.readFileSync(path.resolve(__dirname, filename)).toString()
      )
    }
  })
  if ('function'===typeof callback) { callback(src) }
}

function AttachResourceEndpoints(app, callback) {
  app.get('/', makeHttpResponder(TEST_PAGE_SOURCE))
  var srcMochajs = fs.readFileSync(path.resolve(__dirname, "../node_modules/mocha/mocha.js"))
  var srcMochacss = fs.readFileSync(path.resolve(__dirname, "../node_modules/mocha/mocha.css"))
  var srcChaijs = fs.readFileSync(path.resolve(__dirname, "../node_modules/chai/chai.js"))
  app.get('/mocha.js', makeHttpResponder(srcMochajs, {content_type: 'text/javascript'}))
  app.get('/mocha.css', makeHttpResponder(srcMochacss, {content_type: 'text/css'}))
  app.get('/chai.js', makeHttpResponder(srcChaijs, {content_type: 'text/javascript'}))
  app.get('/sockjs.js', function(req,res){
    res.set({'Content-Type': 'text/javascript'})
    CompileSource(path.resolve(__dirname,'../dist/sockjs.js'), function(sockjs_src){
      res.end(sockjs_src)
    })
  })
  app.get('/compiled.js', function(req,res){
    res.set({'Content-Type': 'text/javascript'})
    CompileSource(path.resolve(__dirname,'../lib/browser.js'), function(code_src){
      res.end(code_src)
    })
  })
  app.get('/tests.js', function(req,res){
    res.set({'Content-Type': 'text/javascript'})
    CompileTests(function(compiled_tests){
      res.end(compiled_tests)
    })
  })
  if ('function'===typeof callback) { callback() }
}

function RunPhantomjs(callback) {
  spawn(
    path.resolve(__dirname, "../node_modules/.bin/mocha-phantomjs"),
    ["http://localhost:"+TEST_SERVER_PORT+"/"],
    {stdio: "inherit"}
  ).on('exit',function(){
    if ('function'===typeof callback) { callback() }
  })
}

function RunBrowserTests(callback) {
  TestServer.create(TEST_SERVER_PORT, function(app){
    AttachResourceEndpoints(app, function(){
      RunPhantomjs(function(){
        TestServer.close(callback)
      })
    })
  })
}

function RunTestServer(callback) {
  TestServer.create(TEST_SERVER_PORT_BASE, function(app){
    app.use(express.logger('dev'))
    AttachResourceEndpoints(app, function(){
      console.info('test server listening at 127.0.0.1:'+TEST_SERVER_PORT_BASE)
    })
  })
}

module.exports = {
  run: RunBrowserTests,
  server: RunTestServer
}
