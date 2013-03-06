var assert = require('assert');
var lzjb = require('../');
var fs = require('fs');

describe('Hello World!!!', function() {
    var s = "Hello World!!!Hello World!!!Hello World!!!Hello World!!!";
    for(var i = 0; i < 10; i++)
        s += s;
    s = new Buffer(s, 'utf8');

    var c = lzjb.compressFile(s);
    c = new Buffer(c);
    it('should be smaller when compressed', function() {
        assert.ok(c.length < s.length, c);
    });

    var d = lzjb.decompressFile(c);
    d = new Buffer(d);

    it('should decompress to the original string', function() {
        assert.ok(d.toString('utf8') === s.toString('utf8'), d.toString('utf8'));
    });
});
