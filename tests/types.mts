// Type-level tests for types/*.d.ts, resolved through package.json "exports".
// Checked by `npm run typecheck`; never executed.
import { bluefile, matfile, version } from 'sigfile';
import { BlueFileReader, BlueHeader } from 'sigfile/bluefile';
import { MatFileReader, MatHeader } from 'sigfile/matfile';

const v: string = version;

const bfr: BlueFileReader = new bluefile.BlueFileReader({ ext_header_type: 'list' });
const xhr: XMLHttpRequest = bfr.read_http('x.tmp', (hdr, err) => {
  if (hdr === null) {
    const e: unknown = err;
    return;
  }
  const h: BlueHeader = hdr;
  const size: number = h.size;
  // @ts-expect-error dview is undefined after readheader()
  const len: number = h.dview.length;
});
xhr.abort();

const mfr: MatFileReader = new matfile.MatFileReader();
mfr.read(new Blob([]), (hdr) => {
  if (hdr) {
    const m: MatHeader = hdr;
    const data: Uint32Array | Float64Array | Int8Array = m.dview as Float64Array;
  }
});

// @ts-expect-error unknown ext_header_type
new BlueHeader(null, { ext_header_type: 'xml' });
