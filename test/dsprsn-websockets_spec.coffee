REQ = {'msg':'req_from_client'}
RSP = {'msg':'rsp_from_server'}

describe 'WebsocketAdapter', ->

  it "should exist", ->
    assert.isFunction(DsprsnWebsockets.Adapter.Client)

  it "create a client, send a message to test server, and get the response", (done)->
    client = new DsprsnWebsockets.Adapter.Client()
    client.on (rsp)->
      assert.deepEqual(RSP, rsp, 'preserve rsp')
      client.end()
      done()
    client.send(REQ)
