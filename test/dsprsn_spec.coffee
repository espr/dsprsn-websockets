MSG_DELAY = 0
REQ = {'msg':'req'}
RSP = {'msg':'rsp'}

delay = (d, f)->
  if typeof d is 'function'
    f = d
    d = MSG_DELAY
  setTimeout(f,d)

describe "dsprsn", ->

  it "should exist", ->
    assert.isObject(dsprsn)

  it "should support both clients and servers in browser", (done)->
    server = new dsprsn.RpcServer()
    client = new dsprsn.RpcClient(adapter: new dsprsn.Adapter.Client(server: server._adapter))

    server.on (req)->
      assert.equal(req, REQ, 'request')
      @resolve RSP
    server.listen()

    client.send(REQ).done (rsp)->
      assert.equal(rsp, RSP, 'response')
      done()
