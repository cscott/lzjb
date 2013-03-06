if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([],function(){
  'use strict';

  // typed array / Buffer compatibility.
  var makeBuffer = function(len) { return []; };
  if (typeof(Uint8Array) !== 'undefined') {
    makeBuffer = function(len) { return new Uint8Array(len); };
  } else if (typeof(Buffer) !== 'undefined') {
    makeBuffer = function(len) { return new Buffer(len); };
  }

  return makeBuffer;
});
