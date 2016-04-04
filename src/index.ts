import {NiftiStream} from './nifti';
import {access, accessSync, createReadStream, R_OK} from 'fs';
import {createGunzip} from 'zlib';

export function fromStream(stream:NodeJS.ReadableStream) : NiftiStream {
    return new NiftiStream(stream);
}

export function fromFileSync(filename:string) : NiftiStream {
    accessSync(filename, R_OK);
    let stream:NodeJS.ReadableStream = createReadStream(filename);
    if (filename.substr(-'.gz'.length) === '.gz') {
        stream = stream.pipe(createGunzip());
    }
    return new NiftiStream(stream);
}

export function fromFile(filename:string, callback:(error:Error, stream: NiftiStream) => any) {
    access(filename, R_OK, function(err) {
        if (err) {
            callback(err, null);
            return;
        }
        let stream:NodeJS.ReadableStream = createReadStream(filename);
        if (filename.substr(-'.gz'.length) === '.gz') {
            stream = stream.pipe(createGunzip());
        }
        callback(null, new NiftiStream(stream));
    });
}

export {NiftiHeader, NiftiDataType, NiftiUnit} from './header';
export {NiftiStream} from './nifti';
export {NiftiVolumeStream} from './volume';
