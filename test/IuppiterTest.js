var assert = require('assert');
var lzjb = require('../');
var fs = require('fs');

describe('Hello World!', function() {
    var s = "Hello World!!!Hello World!!!Hello World!!!Hello World!!!";
    for(var i = 0; i < 10; i++)
        s += s;

    var c = Iuppiter.compress(s);
    it('should be smaller when compressed', function() {
        assert.ok(c.length < s.length, c);
    });

    var d = Iuppiter.decompress(c);
    it('should decompress to the original string', function() {
        assert.ok(d == s, d);
    });
});
