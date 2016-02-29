import {Transform, Readable} from 'stream';
import {EventEmitter} from 'events';
import {NiftiHeader, parseHeader} from './header';
import {NiftiVolumeStream} from './volume';

type ReadableStream = NodeJS.ReadableStream;

/**
 * This class represents a stream of a NIFTI file data. Information
 * is retrieved in 3 phases, each with an associated event:
 * 
 * (1) the `'header'` event is triggered when the NIFTI header has been
 * read and fully parsed.
 * (2) the `'extension'` event is triggered when the extension data, if
 * available, has been fully read. When available, it must be parsed
 * manually.
 * (3) the `'volume-stream'` event is triggered when the actual volume
 * data is ready to be read. At this point, reading must be performed
 * over the provided `NiftiVolumeStream` object.
 */
export class NiftiStream extends EventEmitter {
    public header:NiftiHeader = null;
    public extensionData:Buffer = null;
    private stream:ReadableStream;
    private volumeStream:NiftiVolumeStream = null;
    private triggered:boolean = false;
    private phase:number = 0;
    
    constructor(input: NodeJS.ReadableStream) {
        super();
        this.stream = input;
    }
    
    /** Listen to the availability of the full NIFTI header. Same as `on('header', ...)`.
     * @param callback handler function for nifti header
     */
    public onNiftiHeader(callback: (header: NiftiHeader) => any) : this {
        return this.on('header', callback);
    }

    /** Listen to the availability of the NIFTI extension data. Same as `on('extension', ...)`.
     * This event might never be triggered if no extension data is available.
     * @param callback handler function for nifti header
     */
    public onExtensionData(callback: (data: Buffer) => any) : this {
        return this.on('extension', callback);
    }
    
    /** Listen to the availability of the NIFTI volume stream. Same as `on('volume-stream', ...)`.
     * @param callback handler function for the nifti volume stream instance
     */
    public onVolumeStream(callback: (stream: NiftiVolumeStream) => any) : this {
        return this.on('volume-stream', callback);
    }

    public on(event: string, callback: Function) : this {
        super.on(event, callback);
        this.flow();
        return this;
    }

    public once(event: string, callback: Function) : this {
        super.once(event, callback);
        this.flow();
        return this;
    }
    
    public getExtensionData() : Buffer {
        if (this.phase < 2) {
            throw new Error('Bad state: extension data is not available yet!');
        }
        return this.extensionData;
    }
    
    public getVolumeDataStream() : NiftiVolumeStream {
        if (this.phase !== 2) {
            throw new Error('Bad state: volume data stream is not available yet!');
        }
        return this.volumeStream;
    }
    
    private flow() {
        if (this.triggered) return;
        this.triggered = true;

        let bufs:Buffer[] = [];
        let dataCount = 0;
        let bytesPerVoxel:number = null;
        let voxOffset:number = null;
        let extensionOffset:number = null;
        const onGetData = (data:Buffer) => {
            bufs.push(data);
            dataCount += (<Buffer>data).length;
            if (!this.header && dataCount >= 352) {
                let fullBuf = Buffer.concat(bufs, dataCount);
                let headerBuf = fullBuf.slice(0, 352);
                this.header = parseHeader(headerBuf);
                voxOffset = this.header.vox_offset;
                extensionOffset = voxOffset - 352;
                bufs = [fullBuf.slice(352)];
                dataCount = bufs[0].length;
                this.emit('header', this.header);
                this.phase = 1;
            }
            if (this.header) {
                if (extensionOffset > 0) {
                    if (dataCount >= extensionOffset) {
                        const fullBuf = Buffer.concat(bufs, dataCount);
                        this.extensionData = fullBuf.slice(0, extensionOffset);
                        bufs = [fullBuf.slice(extensionOffset)];
                        dataCount -= extensionOffset;
                        extensionOffset = 0;
                        this.emit('extension', this.extensionData);
                    } else {
                        return;
                    }
                }
                this.stream.pause();
                this.stream.removeListener('data', onGetData);
                this.stream.unshift(bufs[0]);
                this.volumeStream = new NiftiVolumeStream(this.header, this.stream);
                this.emit('volume-stream', this.volumeStream);
                this.phase = 2;
                bufs = null;
            }
        };
        
        this.stream.on('data', onGetData)
            .on('end', () => {
                this.emit('end');
            })
            .on('error', error => {
                this.emit('error', error);
            });
    }
}
