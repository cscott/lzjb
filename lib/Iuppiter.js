if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(['./makeBuffer'], function(makeBuffer) {
/**
$Id: Iuppiter.js 3026 2010-06-23 10:03:13Z Bear $

Copyright (c) 2010 Nuwa Information Co., Ltd, and individual contributors.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

  1. Redistributions of source code must retain the above copyright notice,
     this list of conditions and the following disclaimer.

  2. Redistributions in binary form must reproduce the above copyright
     notice, this list of conditions and the following disclaimer in the
     documentation and/or other materials provided with the distribution.

  3. Neither the name of Nuwa Information nor the names of its contributors
     may be used to endorse or promote products derived from this software
     without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

$Author: Bear $
$Date: 2010-06-23 18:03:13 +0800 (星期三, 23 六月 2010) $
$Revision: 3026 $
*/

var Iuppiter = {
    version: '$Revision: 3026 $'.substring(11).replace(" $", ""),
};


// Constants was used for compress/decompress function.
var NBBY = 8,
    MATCH_BITS = 6,
    MATCH_MIN = 3,
    MATCH_MAX = ((1 << MATCH_BITS) + (MATCH_MIN - 1)),
    OFFSET_MASK = ((1 << (16 - MATCH_BITS)) - 1),
    LEMPEL_SIZE = 1024,
    EOF = -1;

/**
 * Compress string or byte array using fast and efficient algorithm.
 *
 * Because of weak of javascript's natural, many compression algorithm
 * become useless in javascript implementation. The main problem is
 * performance, even the simple Huffman, LZ77/78 algorithm will take many
 * many time to operate. We use LZJB algorithm to do that, it suprisingly
 * fulfills our requirement to compress string fastly and efficiently.
 *
 * Our implementation is based on
 * http://src.opensolaris.org/source/raw/onnv/onnv-gate/usr/src/uts/common/fs/zfs/lzjb.c
 * and
 * http://src.opensolaris.org/source/raw/onnv/onnv-gate/usr/src/uts/common/os/compress.c
 * It is licensed under CDDL.
 *
 * @param {Array|Uint8Array|Buffer|stream} input The stream or byte array
 *        that you want to compress.
 * @param {stream} output Optional output stream.
 * @return {Array|Uint8Array|Buffer} Compressed byte array, or 'output'
 */
Iuppiter.compressFile = function(inStream, outStream) {
    var sstart, dstart = [], slen,
        src = 0, dst = 0,
        cpy, copymap,
        mlen, offset,
        hash, hp,
        lempel,
        i;
    var retval;

    if (!('readByte' in inStream)) {
        var inBuffer = inStream;
        inStream = {
            size: inBuffer.length,
            pos: 0,
            readByte: function() {
                if (this.pos >= this.size) { return EOF; }
                return inBuffer[this.pos++];
            }
        };
    }
    if (!(outStream && 'writeByte' in outStream)) {
        outStream = {
            buffer: [],
            pos: 0,
            writeByte: function(_byte) { this.buffer[this.pos++] = _byte; }
        };
        retval = outStream.buffer;
    } else {
        retval = outStream;
    }

    // if we know the size, write it
    var fileSize;
    if ('size' in inStream && inStream.size >= 0) {
        fileSize = inStream.size;
    } else {
        fileSize = -1; // size unknown
    }

    var size = [], fs = (fileSize+1);
    do {
        size.push(fs & 0x7F);
        fs = Math.floor( fs / 128 ); // division instead of shift
    } while (fs !== 0);
    size[0] |= 0x80;
    for (i=size.length-1; i>=0; i--) {
        outStream.writeByte(size[i]);
    }
    size=null;

    // use Uint16Array if available
    if (typeof(Uint16Array) !== 'undefined') {
        lempel = new Uint16Array(LEMPEL_SIZE);
    } else {
        lempel = [];
    }
    // Initialize lempel array.
    for(i = 0; i < LEMPEL_SIZE; i++)
        lempel[i] = 0;

    var window = makeBuffer(OFFSET_MASK+1);
    var windowpos = 0;
    var winput = function(_byte) {
        window[windowpos++] = _byte;
        if (windowpos >= window.length) {
            windowpos = 0;
        }
        return _byte;
    };

    var outwindow = makeBuffer(17);
    var outpos = 0;
    var dumpout = function() {
        for (var i=0; i<outpos; i++) {
            outStream.writeByte(outwindow[i]);
        }
        outpos = 0;
    };

    var unbuffer = [];
    var get = function() {
        if (unbuffer.length)
            return unbuffer.pop();
        return inStream.readByte();
    };
    var unget = function(_byte) {
        unbuffer.push(_byte);
    };

    var copymask = 1 << (NBBY - 1);
    while (true) {
        var c1 = get();
        if (c1 === EOF) break;

        if ((copymask <<= 1) == (1 << NBBY)) {
            dumpout();
            copymask = 1;
            outwindow[0] = 0;
            outpos = 1;
        }

        var c2 = get();
        if (c2 === EOF) {
            outwindow[outpos++] = winput(c1);
            break;
        }
        var c3 = get();
        if (c3 === EOF) {
            outwindow[outpos++] = winput(c1);
            unget(c2);
            continue;
        }

        hash = (c1 << 16) + (c2 << 8) + c3;
        hash += (hash >> 9);
        hash += (hash >> 5);
        hp = hash & (LEMPEL_SIZE - 1);
        offset = (windowpos - lempel[hp]) & OFFSET_MASK;
        lempel[hp] = windowpos;
        cpy = windowpos - offset;
        if (cpy < 0) { cpy += window.length; }
        if (c1 === window[cpy] &&
            c2 === window[(cpy + 1) & OFFSET_MASK] &&
            c3 === window[(cpy + 2) & OFFSET_MASK]) {
            outwindow[0] |= copymask;
            winput(c1); winput(c2); winput(c3);
            var c4 = get();
            for (mlen = MATCH_MIN; mlen < MATCH_MAX; mlen++) {
                if (c4 === EOF ||
                    c4 !== window[(cpy + mlen) & OFFSET_MASK])
                    break;
                winput(c4);
                c4 = get();
            }
            outwindow[outpos++] = ((mlen - MATCH_MIN) << (NBBY - MATCH_BITS)) |
                (offset >> NBBY);
            outwindow[outpos++] = offset & 0xFF;
            unget(c4);
        } else {
            outwindow[outpos++] = winput(c1);
            unget(c3);
            unget(c2);
        }
    }
    dumpout();

    return retval;
};

/**
 * Decompress string or byte array using fast and efficient algorithm.
 *
 * Our implementation is based on
 * http://src.opensolaris.org/source/raw/onnv/onnv-gate/usr/src/uts/common/fs/zfs/lzjb.c
 * and
 * http://src.opensolaris.org/source/raw/onnv/onnv-gate/usr/src/uts/common/os/compress.c
 * It is licensed under CDDL.
 *
 * @param {Array|Uint8Array|Buffer|stream} input The stream or byte array
 *        that you want to decompress.
 * @param {stream} output Optional output stream.
 * @return {Array|Uint8Array|Buffer} Decompressed byte array, or 'output'
 */
Iuppiter.decompressFile = function(inStream, outStream) {
    var sstart, dstart = [], slen,
        src = 0, dst = 0,
        cpy, copymap,
        mlen, offset,
        i, c;
    var retval;

    var window = makeBuffer(OFFSET_MASK+1);
    var windowpos = 0;

    if (!('readByte' in inStream)) {
        var inBuffer = inStream;
        inStream = {
            size: inBuffer.length,
            pos: 0,
            readByte: function() {
                if (this.pos >= this.size) { return EOF; }
                return inBuffer[this.pos++];
            }
        };
    }
    // read size from stream
    var outSize = 0;
    while (true) {
        c = inStream.readByte();
        if (c&0x80) { outSize |= (c & 0x7f); break; }
        outSize = (outSize | c) * 128;// * instead of << allows sizes up to 2^53
    }
    outSize -= 1; // outSize = -1 means, "size unknown"

    if (!(outStream && 'writeByte' in outStream)) {
        outStream = {
            buffer: (outSize >= 0) ? makeBuffer(outSize) : [],
            pos: 0,
            writeByte: function(byte) { this.buffer[this.pos++] = byte; }
        };
        retval = outStream.buffer;
    } else {
        retval = outStream;
    }

    var copymask = 1 << (NBBY - 1);

    while (outSize !== 0) {
        c = inStream.readByte();
        if (c === EOF) break;

        if ((copymask <<= 1) == (1 << NBBY)) {
            copymask = 1;
            copymap = c;
            c = inStream.readByte();
        }
        if (copymap & copymask) {
            mlen = (c >> (NBBY - MATCH_BITS)) + MATCH_MIN;
            offset = ((c << NBBY) | inStream.readByte()) & OFFSET_MASK;
            cpy = windowpos - offset;
            if (cpy < 0) cpy += window.length;
            if (outSize >= 0) outSize -= mlen;
            while (--mlen >= 0) {
                c = window[windowpos++] = window[cpy++];
                outStream.writeByte(c);
                if (windowpos >= window.length) { windowpos=0; }
                if (cpy >= window.length) { cpy = 0; }
            }
        } else {
            outStream.writeByte(c);
            window[windowpos++] = c;
            if (windowpos >= window.length) { windowpos=0; }
            if (outSize >= 0) outSize--;
        }
    }
    return retval;
};


    return Iuppiter;
});
