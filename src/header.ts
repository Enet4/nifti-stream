import {parseNIfTIHeader} from 'nifti-js';

export interface NiftiHeader {
    [attribute:string]: any,
    littleEndian: boolean,
    sizeof_hdr: number,
    dim_info: number,
    dim: number[],
    intent_p1: number,
    intent_p2: number,
    intent_p3: number,
    intent_code: number,
    datatype: string,
    bitpix: number,
    slice_start: number,
    pixdim: number[],
    vox_offset: number,
    scl_slope: number,
    scl_inter: number,
    slice_end: number,
    slice_code: number,
    xyzt_units: string[],
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
    srow: Float32Array,
    intent_name: string,
    magic: string,
    extension: number[]
}

export function parseHeader(data: Buffer) : NiftiHeader {
    return <NiftiHeader>parseNIfTIHeader(data);
}
