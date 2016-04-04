/// <reference path="../typings/main.d.ts" />

import {fromFileSync, NiftiStream, NiftiHeader, NiftiDataType, NiftiVolumeStream} from '..';
import * as assert from 'assert';


describe('NIFTI stream', function() {
    let nifti: NiftiStream;

    it('should obtain a stream from a file', function() {
        nifti = fromFileSync('test/avg152T1_LR_nifti.nii.gz');
        assert(nifti);
    });

    let header: NiftiHeader;
    let volume: NiftiVolumeStream;
    it('should retrieve the header and volume stream', function(done) {
        let k = 0;
        nifti.onNiftiHeader((head) => {
            assert(head);
            header = head;
            if (++k === 2) done();
        }).onVolumeStream((vol) => {
            volume = vol;
            assert(vol);
            if (++k === 2) done();
        }).on('error', (e) => {
            assert.fail('Stream Error', e);
        });
    });

    describe('NIFTI header', function() {
        it('should have proper attributes', function() {
            assert.strictEqual(header.sizeof_hdr, 348, 'sizeof_hdr');
            assert.strictEqual(header.bitpix, 8, 'bitpix');
            assert.strictEqual(header.datatype, NiftiDataType.UINT8, 'datatype');
            assert(header.dim instanceof Array, 'dim is an array');
            assert.strictEqual(header.dim[0], 3, 'dim[0]');
            assert.strictEqual(header.dim[1], 91, 'dim[1]');
            assert.strictEqual(header.dim[2], 109, 'dim[2]');
            assert.strictEqual(header.dim[3], 91, 'dim[3]');
            assert.strictEqual(header.magic, 'n+1', 'magic');
        });
    });
    
    describe('volume stream', function() {
        this.slow(200);
        it('should give the expected slices', function(done) {
            let k = 0;
            const sliceSize = header.dim[1] * header.dim[2] * (header.bitpix >> 3);
            volume.onSlice((sliceNum: number, data: Buffer) => {
                assert.strictEqual(sliceNum, k);
                k++;
                assert.strictEqual(data.length, sliceSize);
            }).on('end', () => {
                assert.strictEqual(k, header.dim[3]);
                done();
            });
        });
    });

});
