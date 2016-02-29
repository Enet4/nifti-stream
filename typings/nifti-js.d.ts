/// just a lame stub
declare module 'nifti-js' {
    export function parse(buffer:Buffer|ArrayBuffer) : Object;
    export function parseHeader(buffer:Buffer|ArrayBuffer) : Object;
    export function parseNIfTIHeader(buffer:Buffer|ArrayBuffer) : Object;
}