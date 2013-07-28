path = require('path')
util = require('espr-util')

run_tests = ->
  require('./test/test-runner.js').run()

test_server = ->
  require('./test/test-runner.js').server()

build = ->
  browserify = path.resolve(__dirname,'node_modules/.bin/browserify')
  browser_js = path.resolve(__dirname,'lib/browser.js')
  dest_fpath = path.resolve(__dirname,'dist/dsprsn-websockets.js')
  util.sh "#{browserify} --detect-globals false #{browser_js} > #{dest_fpath}"

task 'build', "Build browser src", -> build()
task 'test', "Run browser tests", -> run_tests()
task 'test:server', "Start test server", -> test_server()
