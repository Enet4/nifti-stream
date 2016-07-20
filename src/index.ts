import {NiftiStream} from './nifti';
import {access, accessSync, createReadStream, R_OK} from 'fs';
import {createGunzip} from 'zlib';

/** Take an existing stream and obtain a NIFTI-1 file stream.
 * @param stream a readable stream
 * @return a `NiftiStream` object that interprets the contents of the given
 * stream as NIFTI.
 */
export function fromStream(stream:NodeJS.ReadableStream) : NiftiStream {
    return new NiftiStream(stream);
}


/** Create a new NIFTI-1 file stream from a file. If the file is gzipped,
 * this function will automatically decompress the file.
 * @param filename the file system path to the file
 * @return a `NiftiStream` object that interprets the file's contents as NIFTI.
 * @throw Error if the file does not exist or can not be read
 */
export function fromFileSync(filename:string) : NiftiStream {
    accessSync(filename, R_OK);
    let stream:NodeJS.ReadableStream = createReadStream(filename);
    if (filename.substr(-'.gz'.length) === '.gz') {
        stream = stream.pipe(createGunzip());
    }
    return new NiftiStream(stream);
}

/** Create a new NIFTI-1 file stream from a file. If the file is gzipped,
 * this function will automatically decompress the file.
 * @param filename the file system path to the file
 * @param callback a callback function for retrieving either the
 * error or the a new stream interpreting the file's contents as NIFTI.
 */
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

export {NiftiHeader, NiftiDataType, NiftiUnit, getSpatialUnits, getTimeUnits} from './header';
export {NiftiStream} from './nifti';
export {NiftiVolumeStream} from './volume';
