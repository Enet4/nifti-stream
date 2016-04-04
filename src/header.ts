import {endianness} from 'os';

export enum NiftiUnit {
    UNKNOWN = 0,
    METER = 1,
    MM = 2,
    MICRON = 3,
    SEC = 8,
    MSEC = 16,
    USEC = 24,
    HZ = 32,
    PPM = 40,
    RADS = 48
}

export enum NiftiDataType {
    NONE = 0,
    UNKNOWN = 0,
    
    UINT8 = 2,
    INT16 = 4,
    INT32 = 8,
    FLOAT32 = 16,
    COMPLEX64 = 32,
    FLOAT64 = 64,
    RGB24 = 128,
    INT8 = 256,
    UINT16 = 512,
    UINT32 = 768,
    INT64 = 1024,
    UINT64 = 1280,
    FLOAT128 = 1536,
    COMPLEX128 = 1792,
    COMPLEX256 = 2048,
    RGBA32 = 2304
}

export interface NiftiHeader {
    [attribute:string]: any,
    endianness: "LE" | "BE",
    littleEndian: boolean,
    sizeof_hdr: number,
    dim_info: number,
    dim: number[],
    intent_p1: number,
    intent_p2: number,
    intent_p3: number,
    intent_code: number,
    datatype: NiftiDataType,
    bitpix: number,
    slice_start: number,
    pixdim: number[],
    vox_offset: number,
    scl_slope: number,
    scl_inter: number,
    slice_end: number,
    slice_code: number,
    xyzt_units: NiftiUnit,
    cal_max: number,
    cal_min: number,
    slice_duration: number,
    toffset: number,
    descrip: string,
    aux_file: string,
    qform_code: number,
    sform_code: number,
    quatern_b: number,
    quatern_c: number,
    quatern_d: number,
    qoffset_x: number,
    qoffset_y: number,
    qoffset_z: number,
    srow_x: number[],
    srow_y: number[],
    srow_z: number[],
    intent_name: string,
    magic: string
}

interface ResolvedBuffer {
    readByte(offset: number): number;
    readInt(offset: number): number;
    readShort(offset: number): number;
    readFloat(offset: number): number;
    readDouble(offset: number): number;
    readBinary(offset: number, length: number): Buffer;
}

class ResolvedBufferStream {
    private buf: ResolvedBuffer;
    private i: number;

    constructor(rb: ResolvedBuffer) {
        this.buf = rb;
        this.i = 0;
    }
    
    static LE(data:Buffer): ResolvedBufferStream {
        return new ResolvedBufferStream(new ResolvedBufferLE(data));
    }

    static BE(data:Buffer): ResolvedBufferStream {
        return new ResolvedBufferStream(new ResolvedBufferBE(data));
    }
    
    nextByte(): number {
        return this.buf.readByte(this.i++);
    }
    
    nextInt(): number {
        const o = this.buf.readInt(this.i);
        this.i += 4;
        return o;
    }
    nextShort(): number {
        const o = this.buf.readShort(this.i);
        this.i += 2;
        return o;
    }
    nextFloat(): number {
        const o = this.buf.readFloat(this.i);
        this.i += 4;
        return o;
        
    }
    nextDouble(): number {
        const o = this.buf.readDouble(this.i);
        this.i += 8;
        return o;
    }
    nextBinary(length: number): Buffer {
        const o = this.buf.readBinary(this.i, length);
        this.i += length;
        return o;
    }
    skip(nbytes: number) {
        this.i += nbytes;
    }
}

class ResolvedBufferLE implements ResolvedBuffer {
    private data: Buffer;
    constructor(data: Buffer) {
        this.data = data;
    }
    readByte(offset: number): number {
        return this.data.readUInt8(offset);
    }
    readInt(offset: number): number {
        return this.data.readInt32LE(offset);
    }
    readShort(offset: number): number {
        return this.data.readInt16LE(offset);
    }
    readFloat(offset: number): number {
        return this.data.readFloatLE(offset);
    }
    readDouble(offset: number): number {
        return this.data.readDoubleLE(offset);
    }
    readBinary(offset: number, length: number): Buffer {
        return this.data.slice(offset, offset + length);
    }
}

class ResolvedBufferBE implements ResolvedBuffer {
    private data: Buffer;
    constructor(data: Buffer) {
        this.data = data;
    }
    readByte(offset: number): number {
        return this.data.readUInt8(offset);
    }
    readInt(offset: number): number {
        return this.data.readInt32BE(offset);
    }
    readShort(offset: number): number {
        return this.data.readInt16BE(offset);
    }
    readFloat(offset: number): number {
        return this.data.readFloatBE(offset);
    }
    readDouble(offset: number): number {
        return this.data.readDoubleBE(offset);
    }
    readBinary(offset: number, length: number): Buffer {
        return this.data.slice(offset, offset + length);
    }
}

function as(data: Buffer, bigEndian: boolean) : ResolvedBufferStream {
    return (bigEndian === true)
        ? ResolvedBufferStream.BE(data)
        : ResolvedBufferStream.LE(data);
}

function detectEndianness(headerData: Buffer) : boolean {
    // fetch dim, check if it's into the 1-7 range
    const dim_0 = headerData.readUInt16LE(40);
    if (dim_0 >= 1 && dim_0 <= 7) {
        return false;
    }
    const dim_0_be = headerData.readUInt16BE(40);
    if (dim_0_be >= 1 && dim_0_be <= 7) {
        return true;
    }
    throw new Error("Could not detect the volume's endianness");
}

export function parseHeader(data: Buffer, bigEndian?:boolean) : NiftiHeader {
    if (bigEndian === undefined) {
        // attempt to determine
        bigEndian = detectEndianness(data);
    }
    const rbuf = as(data, bigEndian);
//  int   sizeof_hdr;    /*!< MUST be 348           */  /* int sizeof_hdr;      */
    const sizeof_hdr = rbuf.nextInt();
//  char  data_type[10]; /*!< ++UNUSED++            */  /* char data_type[10];  */
    //const data_type = rbuf.nextBinary(10);
//  char  db_name[18];   /*!< ++UNUSED++            */  /* char db_name[18];    */
    //const db_name = rbuf.nextBinary(18);
//  int   extents;       /*!< ++UNUSED++            */  /* int extents;         */
    //const extents = rbuf.nextInt();
//  short session_error; /*!< ++UNUSED++            */  /* short session_error; */
    //const session_error = rbuf.nextByte();
//  char  regular;       /*!< ++UNUSED++            */  /* char regular;        */
    //const regular = rbuf.nextByte();
    rbuf.skip(35); // 10 + 18 + 4 + 2 + 1
//  char  dim_info;      /*!< MRI slice ordering.   */  /* char hkey_un0;       */
    const dim_info = rbuf.nextByte();
//                                       /*--- was image_dimension substruct ---*/
//  short dim[8];        /*!< Data array dimensions.*/  /* short dim[8];        */
    const dim = [];
    for (let i = 0 ; i < 8 ; i++) {
        dim.push(rbuf.nextShort());
    }
//  float intent_p1 ;    /*!< 1st intent parameter. */  /* short unused8;       */
    const intent_p1 = rbuf.nextFloat();
//                                                      /* short unused9;       */
//  float intent_p2 ;    /*!< 2nd intent parameter. */  /* short unused10;      */
    const intent_p2 = rbuf.nextFloat();
//                                                      /* short unused11;      */
//  float intent_p3 ;    /*!< 3rd intent parameter. */  /* short unused12;      */
    const intent_p3 = rbuf.nextFloat();
//                                                      /* short unused13;      */
//  short intent_code ;  /*!< NIFTI_INTENT_* code.  */  /* short unused14;      */
    const intent_code = rbuf.nextShort();
//  short datatype;      /*!< Defines data type!    */  /* short datatype;      */
    const datatype = rbuf.nextShort();
//  short bitpix;        /*!< Number bits/voxel.    */  /* short bitpix;        */
    const bitpix = rbuf.nextShort();
//  short slice_start;   /*!< First slice index.    */  /* short dim_un0;       */
    const slice_start = rbuf.nextShort();
//  float pixdim[8];     /*!< Grid spacings.        */  /* float pixdim[8];     */
    const pixdim = [];
    for (let i = 0 ; i < 8 ; i++) {
        dim.push(rbuf.nextFloat());
    }
//  float vox_offset;    /*!< Offset into .nii file */  /* float vox_offset;    */
    const vox_offset = rbuf.nextFloat();
//  float scl_slope ;    /*!< Data scaling: slope.  */  /* float funused1;      */
    const scl_slope = rbuf.nextFloat();
//  float scl_inter ;    /*!< Data scaling: offset. */  /* float funused2;      */
    const scl_inter = rbuf.nextFloat();
//  short slice_end;     /*!< Last slice index.     */  /* float funused3;      */
    const slice_end = rbuf.nextShort();
//  char  slice_code ;   /*!< Slice timing order.   */
    const slice_code = rbuf.nextByte();
//  char  xyzt_units ;   /*!< Units of pixdim[1..4] */
    const xyzt_units = rbuf.nextByte();
//  float cal_max;       /*!< Max display intensity */  /* float cal_max;       */
    const cal_max = rbuf.nextFloat();
//  float cal_min;       /*!< Min display intensity */  /* float cal_min;       */
    const cal_min = rbuf.nextFloat();
//  float slice_duration;/*!< Time for 1 slice.     */  /* float compressed;    */
    const slice_duration = rbuf.nextFloat();
//  float toffset;       /*!< Time axis shift.      */  /* float verified;      */
    const toffset = rbuf.nextFloat();
//  int   glmax;         /*!< ++UNUSED++            */  /* int glmax;           */
//    const glmax = rbuf.nextInt();
//  int   glmin;         /*!< ++UNUSED++            */  /* int glmin;           */
//    const glmin = rbuf.nextInt();
    rbuf.skip(8);

//                                          /*--- was data_history substruct ---*/
//  char  descrip[80];   /*!< any text you like.    */  /* char descrip[80];    */
    const descrip = rbuf.nextBinary(80).toString();
    
//  char  aux_file[24];  /*!< auxiliary filename.   */  /* char aux_file[24];   */
    const aux_file = rbuf.nextBinary(24).toString();

//  short qform_code ;   /*!< NIFTI_XFORM_* code.   */  /*-- all ANALYZE 7.5 ---*/
    const qform_code = rbuf.nextShort();
//  short sform_code ;   /*!< NIFTI_XFORM_* code.   */  /*   fields below here  */
    const sform_code = rbuf.nextShort();
//                                                      /*   are replaced       */
//  float quatern_b ;    /*!< Quaternion b param.   */
    const quatern_b = rbuf.nextFloat();
//  float quatern_c ;    /*!< Quaternion c param.   */
    const quatern_c = rbuf.nextFloat();
//  float quatern_d ;    /*!< Quaternion d param.   */
    const quatern_d = rbuf.nextFloat();
//  float qoffset_x ;    /*!< Quaternion x shift.   */
    const qoffset_x = rbuf.nextFloat();
//  float qoffset_y ;    /*!< Quaternion y shift.   */
    const qoffset_y = rbuf.nextFloat();
//  float qoffset_z ;    /*!< Quaternion z shift.   */
    const qoffset_z = rbuf.nextFloat();

//  float srow_x[4] ;    /*!< 1st row affine transform.   */
    const srow_x = [ rbuf.nextFloat(), rbuf.nextFloat(),
            rbuf.nextFloat(), rbuf.nextFloat()];
//  float srow_y[4] ;    /*!< 2nd row affine transform.   */
    const srow_y = [ rbuf.nextFloat(), rbuf.nextFloat(),
            rbuf.nextFloat(), rbuf.nextFloat()];
//  float srow_z[4] ;    /*!< 3rd row affine transform.   */
    const srow_z = [ rbuf.nextFloat(), rbuf.nextFloat(),
            rbuf.nextFloat(), rbuf.nextFloat()];

//  char intent_name[16];/*!< 'name' or meaning of data.  */
    const intent_name = rbuf.nextBinary(16).toString();
    
//  char magic[4] ;      /*!< MUST be "ni1\0" or "n+1\0". */
    const magic = rbuf.nextBinary(4).slice(0, 3).toString();
 
     return {
        sizeof_hdr,
        littleEndian: !bigEndian,
        endianness: bigEndian ? "BE" : "LE",
        dim_info,
        dim,
        intent_p1,
        intent_p2,
        intent_p3,
        intent_code,
        datatype,
        bitpix,
        slice_start,
        pixdim,
        vox_offset,
        scl_slope,
        scl_inter,
        slice_end,
        slice_code,
        xyzt_units,
        cal_max,
        cal_min,
        slice_duration,
        toffset,
        descrip,
        aux_file,
        qform_code,
        sform_code,
        quatern_b,
        quatern_c,
        quatern_d,
        qoffset_x,
        qoffset_y,
        qoffset_z,
        srow_x,
        srow_y,
        srow_z,
        intent_name,
        magic
    };
}
