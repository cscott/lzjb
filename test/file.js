var assert = require("assert");
var lzjb = require('../');
var fs = require('fs');

describe('lzjb file decode', function(){
  ['sample0', 'sample1', 'sample2', 'sample3', 'sample4'].forEach(function(f) {
      it('should correctly decode '+f, function() {
          var compressedData = fs.readFileSync('test/'+f+'.lzjb');
          var referenceData = fs.readFileSync('test/'+f+'.ref');
          var data = lzjb.decompressFile(compressedData);
          // convert to buffer
          data = new Buffer(data);
          assert.equal(data.toString('hex'), referenceData.toString('hex'));
      });
  });
});

describe('lzjb file encode->decode', function(){
  ['sample0', 'sample1', 'sample2', 'sample3', 'sample4'].forEach(function(f) {
      [null, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function(level) {
          var desc = (level===null) ? 'default' : ('-'+level);
          it('encoded '+f+' should correctly decode at '+desc, function() {
              var referenceData = fs.readFileSync('test/'+f+'.ref');
              var data = lzjb.compressFile(referenceData, null, level);
              // convert to buffer
              data = new Buffer(data);
              // round trip
              var data2 = lzjb.decompressFile(data);
              // convert to buffer
              data2 = new Buffer(data2);
              assert.ok(referenceData.toString('hex') === data2.toString('hex'));
          });
      });
  });
});

describe('lzjb file encode', function() {
  // ensure that our output is still byte-identical to (tweaked) C
  // implementation. This helps protect us from breaking the compression
  // when we attempt JavaScript optimizations.
  ['sample0', 'sample1', 'sample2', 'sample3', 'sample4'].forEach(function(f) {
      it('should correctly encode '+f, function() {
          var referenceData = fs.readFileSync('test/'+f+'.ref');
          var compressedData = fs.readFileSync('test/'+f+'.lzjb');
          var data = lzjb.compressFile(referenceData);
          // convert to buffer
          data = new Buffer(data);
          assert.equal(data.toString('hex'), compressedData.toString('hex'));
      });
  });
});
