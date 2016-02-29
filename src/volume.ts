import {EventEmitter} from 'events';
import {NiftiHeader} from './header';
type ReadableStream = NodeJS.ReadableStream;

/**
 * This class represents a stream of NIFTI volume data. The volume can
 * be retrieved in slices by listening to `slice` events, which will
 * asynchronously provide the raw data of each slice. Alternatively,
 * call `toRawStream()` to obtain a bare `ReadableStream` of the volume.
 */
export class NiftiVolumeStream extends EventEmitter {
    private istream: ReadableStream;
    private iheader: NiftiHeader;
    private triggered: boolean = false;

    constructor(header: NiftiHeader, stream: NodeJS.ReadableStream) {
        super();
        this.iheader = header;
        this.istream = stream;
    }

    /** Listen to incoming chunks of data, in slices. Chunks are guaranteed to come in
     * order.
     * @param callback the callback function
     * @return this
     */
    public onSliceChunk(callback: (slice: number, data: Buffer) => any): this {
        return this.on('slice-chunk', callback);
    }

    /** Listen to incoming slices of the volume (through the Z axis). The provided
     * data is guaranteed to contain all raw bytes of the slice.
     * @param callback the callback function
     * @return this
     */
    public onSlice(callback: (slice: number, data: Buffer) => any): this {
        return this.on('slice', callback);
    }

    
    /** Listen to events.
     * @param callback the callback function
     * @return this
     */
    public on(event: string, callback: Function): this {
        if (this.istream === null) throw new Error("Invalid state: no input stream");
        super.on(event, callback);
        this.flow();
        return this;
    }

    /** Listen to an event once.
     * @param callback the callback function
     * @return this
     */
    public once(event: string, callback: Function): this {
        if (this.istream === null) throw new Error("Invalid state: no input stream");
        super.once(event, callback);
        this.flow();
        return this;
    }

    private flow() {
        if (this.triggered) return;
        this.triggered = true;

        const [dim0, dim1, dim2, dim3] = this.iheader.dim;
        const bytesPerVoxel = this.iheader.bitpix >> 3;
        const sliceSize = dim1 * dim2 * bytesPerVoxel;

        let sliceOffset = 0; // offset in bytes from the beginning of the volume
        let z = 0; // slice index

        let sliceChunks = [];
        const accumulateSliceChunk = (chunk: Buffer) => {
            if (this.listenerCount('slice') === 0) return;
            sliceChunks.push(chunk);
        };
        
        const completeSlice = () => {
            if (this.listenerCount('slice') === 0) return;
            this.emit('slice', z, Buffer.concat(sliceChunks));
            sliceChunks = [];
        };

        const onGetData = (data) => {
            let nextZStart = (z + 1) * sliceSize;
            let restChunk = data;
            while (restChunk.length > 0) {
                // take enough bytes to complete the slice from the chunk
                const requestedChunkSize = nextZStart - sliceOffset;
                const chunk = restChunk.slice(0, requestedChunkSize);
                this.emit('slice-chunk', z, chunk);
                accumulateSliceChunk(chunk);
                if (chunk.length === requestedChunkSize) {
                    // got them all
                    completeSlice();
                    z += 1;
                    nextZStart += sliceSize;
                }
                restChunk = restChunk.slice(chunk.length);
                sliceOffset += chunk.length;
            }
        };

        this.istream
            .on('data', onGetData)
            .on('end', () => {
                if (sliceChunks.length > 0) {
                    completeSlice();
                }
                this.emit('end');
            })
            .resume();
    }

    /** Convert this object into a raw readable stream of bytes. This method must be
     * called without registering event listeners, and will make this object unusable.
     * @return a stream of raw volume bytes
     */
    public toRawStream(): NodeJS.ReadableStream {
        if (this.triggered) {
            throw new Error("Invalid state: cannot convert to raw stream when already in flowing mode!")
        }
        const o = this.istream;
        this.istream = null;
        return o;
    }
}
