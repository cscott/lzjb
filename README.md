# lzjb

`lzjb` is a fast pure-JavaScript implementation of LZJB
compression/decompression.  It was originally written by "Bear"
based on the OpenSolaris C implementations.
C. Scott Ananian cleaned up the source code and packaged it for `node`
and `volo`.

## How to install

```
npm install lzjb
```
or
```
volo add cscott/lzjb
```

This package uses
[Typed Arrays](https://developer.mozilla.org/en-US/docs/JavaScript/Typed_arrays)
and so requires node.js >= 0.5.5.  Full browser compatibility table
is available at [caniuse.com](http://caniuse.com/typedarrays); briefly:
IE 10, Firefox 4, Chrome 7, or Safari 5.1.

## Testing

```
npm install
npm test
```

## Usage

There is a binary available in bin:
```
$ bin/lzjb --help
$ echo "Test me" | bin/lzjb -z > test.lzjb
$ bin/lzjb -d test.lzjb
Test me
```

From JavaScript:
```
var lzjb = require('lzjb');
var data = new Buffer('Example data', 'utf8');
var compressed = lzjb.compressFile(data);
var uncompressed = lzjb.uncompressFile(compressed);
// convert from array back to string
var data2 = new Buffer(uncompressed).toString('utf8');
console.log(data2);
```
There is a streaming interface as well.

See the tests in the `tests/` directory for further usage examples.

## Documentation

`require('lzjb')` returns a `lzjb` object.  It contains two main
methods.  The first is a function accepting one or two parameters:

`lzjb.compressFile = function(input, [output])`

The `input` argument can be a "stream" object (which must implement the
`readByte` method), or a `Uint8Array`, `Buffer`, or array.

If you omit the second argument, `compressFile` will return a JavaScript
array containing the byte values of the compressed data.  If you pass
a second argument, it must be a "stream" object (which must implement the
`writeByte` method).

The second exported method is a function accepting one or two parameters:

`lzjb.decompressFile = function(input, [output])`

The `input` parameter is as above.

If you omit the second argument, `decompressFile` will return a
`Uint8Array`, `Buffer` or JavaScript array with the decompressed
data, depending on what your platform supports.  For most modern
platforms (modern browsers, recent node.js releases) the returned
value will be a `Uint8Array`.

If you provide the second argument, it must be a "stream", implementing
the `writeByte` method.

## Related projects

* https://code.google.com/p/jslzjb/ Original JavaScript port by Bear
* http://en.wikipedia.org/wiki/LZJB Wikipedia article on LZJB compression
* http://src.opensolaris.org/source/xref/onnv/onnv-gate/usr/src/uts/common/os/compress.c "compress" source code (describes LZJB algorithm)
* http://cvs.opensolaris.org/source/xref/onnv/onnv-gate/usr/src/uts/common/fs/zfs/lzjb.c In-kernel implementation of LZJB

## License

> Copyright (c) 2010 Nuwa Information Co., Ltd, and individual contributors.
>
> Copyright (c) 2013 C. Scott Ananian
>
> All rights reserved.
>
> Redistribution and use in source and binary forms, with or without
> modification, are permitted provided that the following conditions are met:
>
>   1. Redistributions of source code must retain the above copyright notice,
>      this list of conditions and the following disclaimer.
>
>   2. Redistributions in binary form must reproduce the above copyright
>      notice, this list of conditions and the following disclaimer in the
>      documentation and/or other materials provided with the distribution.
>
>   3. Neither the name of Nuwa Information nor the names of its contributors
>      may be used to endorse or promote products derived from this software
>      without specific prior written permission.
>
> THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
> AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
> IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
> DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE
> FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
> DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
> SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
> CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
> OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
> OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
