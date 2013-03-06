if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(['./lib/freeze', './lib/Iuppiter'], function(freeze, Iuppiter) {
  'use strict';

  return freeze({
        version: "0.0.1",
        compress: Iuppiter.compress,
        decompress: Iuppiter.decompress
  });
});
