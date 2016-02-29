# nifti-stream: Stream-based NIfTI-1 file reader

This package implements an asynchronous, stream-based reader of [NIfTI-1](http://nifti.nimh.nih.gov/nifti-1) files,
a format defined by the Neuroimaging Informatics Technology Initiative (NIfTI).

Although a few solutions for reading NIFTI files in JavaScript are already available,
this one relies on an asynchronous file resolution, retrieving the contents in
smaller parts (header, extension data and individual slices). This approach is much
more memory efficient, which is a plus when dealing with very large volumes.

## Example

**JavaScript (ECMAScript 5)**

```javascript
var fromFileSync = require('nifti-stream').fromFileSync;

fromFileSync('path/to/myvolume.nii.gz')
  .onNiftiHeader(function(header) {
      // header contains the attributes
  }).onVolumeStream(function(stream) {
      stream.onSlice(function(sliceNumber, data) {
          console.log('Read slice #' + sliceNumber + ', ' + data.length + ' bytes');
      }).on('end', function() {
          console.log('Done!');
      });
  });
```

**TypeScript**

```javascript
import {createStream, NiftiHeader, NiftiVolumeStream} from 'nifti-stream';

fromFileSync('path/to/myvolume.nii.gz')
  .onNiftiHeader((header: NiftiHeader) => {
      // header contains the attributes
  }).onVolumeStream((stream: NiftiVolumeStream) => {
      stream.onSlice((sliceNumber: number, data: Buffer) {
          console.log(`Read slice #${sliceNumber}, ${data.length} bytes`);
      }).on('end', () => {
          console.log('Done!');
      });
  });
```

## License

MIT
