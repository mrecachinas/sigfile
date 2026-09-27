"""Regenerate the MAT-file test fixtures in this directory.

Run from the repository root: python3 tests/dat/make_mat_fixtures.py
Requires numpy and scipy. Big-endian variants are generated at test time
by tests/helpers.js.
"""

import os
import struct

import numpy as np
import scipy.io as sio
import scipy.sparse as sp
from scipy.io.matlab._mio5 import MatFile5Writer

DIR = os.path.dirname(os.path.abspath(__file__))


def save(name, value, **kwargs):
    sio.savemat(os.path.join(DIR, name), {"x": value}, **kwargs)


save("int16.mat", np.arange(-5, 5, dtype=np.int16))
save("single.mat", np.array([0, 0.5, 0.25, -1.5, 3.75], dtype=np.float32))
save("complex.mat", np.array([1 + 2j, 3 - 4j, -5 + 0.5j]))
save("matrix.mat", np.arange(12, dtype=np.float64).reshape(3, 4))
save("ndarray.mat", np.arange(24, dtype=np.float64).reshape(2, 3, 4))
save("sparse.mat", sp.csc_matrix(([1.5, -2.0, 3.25], ([0, 2, 3], [1, 1, 4])), shape=(4, 5)))
save(
    "sparse_complex.mat",
    sp.csc_matrix(([1 + 1j, complex(0, -2)], ([1, 0], [0, 2])), shape=(2, 3)),
)
save("logical.mat", np.array([True, False, True, True]))
save("int64.mat", np.array([-1, -(2**40), 2**40 + 7], dtype=np.int64))
save("uint64.mat", np.array([1, 2**32 + 5, 2**53], dtype=np.uint64))
save("char.mat", "hello")
save("struct.mat", {"a": 1.0})
save("compressed.mat", np.arange(4, dtype=np.float64), do_compression=True)

with open(os.path.join(DIR, "global.mat"), "wb") as f:
    MatFile5Writer(f, global_vars=["x"]).put_variables({"x": np.array([7.0, 8.0])})


def tag(data_type, nbytes):
    return struct.pack("<II", data_type, nbytes)


def small(data_type, data):
    return struct.pack("<HH", data_type, len(data)) + data.ljust(4, b"\0")


# MATLAB stores small integer-valued doubles compactly; scipy never does,
# so write one by hand: class mxDOUBLE_CLASS, values as a small miUINT8 element.
header = b"MATLAB 5.0 MAT-file, compacted double fixture".ljust(116, b" ")
header += b"\0" * 8 + struct.pack("<H", 0x0100) + b"IM"
matrix = (
    tag(6, 8) + struct.pack("<II", 6, 0)  # array flags: mxDOUBLE_CLASS
    + tag(5, 8) + struct.pack("<ii", 1, 3)  # dims 1x3
    + small(1, b"x")  # name
    + small(2, bytes([1, 2, 250]))  # values as miUINT8
)
with open(os.path.join(DIR, "compacted.mat"), "wb") as f:
    f.write(header + tag(14, len(matrix)) + matrix)
