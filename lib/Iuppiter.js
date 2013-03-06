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
    LEMPEL_SIZE = 1024;

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
 * http://src.opensolaris.org/source/raw/onnv/onnv-gate/
 * usr/src/uts/common/os/compress.c
 * It is licensed under CDDL.
 *
 *
 * @param {String|Array} input The string or byte array that you want to
 *                             compress.
 * @return {Array} Compressed byte array.
 */
Iuppiter.compress = function(input) {
    var sstart, dstart = [], slen,
        src = 0, dst = 0,
        cpy, copymap,
        copymask = 1 << (NBBY - 1),
        mlen, offset,
        hash, hp,
        lempel,
        i;

    // use Uint16Array if available
    if (typeof(Uint16Array) !== 'undefined') {
        lempel = new Uint16Array(LEMPEL_SIZE);
    } else {
        lempel = [];
    }
    // Initialize lempel array.
    for(i = 0; i < LEMPEL_SIZE; i++)
        lempel[i] = 0;

    sstart = input;
    slen = sstart.length;
    dstart[dst++] = 0x80; // "length unknown" XXX

    while (src < slen) {
        if ((copymask <<= 1) == (1 << NBBY)) {
            if (dst >= slen - 1 - 2 * NBBY) {
                mlen = slen;
                for (src = 0, dst = 0; mlen; mlen--)
                    dstart[dst++] = sstart[src++];
                return dstart;
            }
            copymask = 1;
            copymap = dst;
            dstart[dst++] = 0;
        }
        if (src > slen - MATCH_MAX) {
            dstart[dst++] = sstart[src++];
            continue;
        }
        hash = ((sstart[src] << 16) +
                (sstart[src + 1] << 8) +
                sstart[src + 2]);
        hash += (hash >> 9);
        hash += (hash >> 5);
        hp = hash & (LEMPEL_SIZE - 1);
        offset = (src - lempel[hp]) & OFFSET_MASK;
        lempel[hp] = src;
        cpy = src - offset;
        if (cpy >= 0 && cpy != src &&
            sstart[src] == sstart[cpy] &&
            sstart[src + 1] == sstart[cpy + 1] &&
            sstart[src + 2] == sstart[cpy + 2]) {
            dstart[copymap] |= copymask;
            for (mlen = MATCH_MIN; mlen < MATCH_MAX; mlen++)
                if (sstart[src + mlen] != sstart[cpy + mlen])
                    break;
            dstart[dst++] = ((mlen - MATCH_MIN) << (NBBY - MATCH_BITS)) |
                            (offset >> NBBY);
            dstart[dst++] = offset;
            src += mlen;
        } else {
            dstart[dst++] = sstart[src++];
        }
    }

    return dstart;
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
Iuppiter.decompress = function(inStream, outStream) {
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
            readByte: function() { return inBuffer[this.pos++]; }
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
        if (c===undefined) break;

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
