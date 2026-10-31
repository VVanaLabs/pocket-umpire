// Pixel <-> pitch-meter geometry. Pure code, unit-tested — models never decide here.
export type Pt2 = { x: number; y: number };

/** 3x3 homography from 4+ ground-plane correspondences (DLT, least squares). */
export function dltHomography(src: Pt2[], dst: Pt2[]): number[] {
  if (src.length < 4 || src.length !== dst.length)
    throw new Error("need 4+ point pairs");
  // Solve Ah=0 via normal equations on the 2n x 9 system (small, demo-grade).
  const A: number[][] = [];
  for (let i = 0; i < src.length; i++) {
    const { x, y } = src[i];
    const { x: xp, y: yp } = dst[i];
    A.push([-x, -y, -1, 0, 0, 0, xp * x, xp * y, xp]);
    A.push([0, 0, 0, -x, -y, -1, yp * x, yp * y, yp]);
  }
  const h = solveHomogeneous(A);
  const norm = h[8] || 1;
  return h.map((v) => v / norm);
}

function solveHomogeneous(A: number[][]): number[] {
  // Smallest singular vector via Jacobi eigen-decomposition of AᵀA (9x9, symmetric).
  const n = 9;
  const M: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (const row of A)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) M[i][j] += row[i] * row[j];
  // Jacobi rotations
  const V: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
  for (let sweep = 0; sweep < 64; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) off += M[p][q] * M[p][q];
    if (off < 1e-20) break;
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) {
        const apq = M[p][q];
        if (Math.abs(apq) < 1e-15) continue;
        const theta = (M[q][q] - M[p][p]) / (2 * apq);
        const t =
          Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = c * t;
        for (let k = 0; k < n; k++) {
          const mkp = M[k][p],
            mkq = M[k][q];
          M[k][p] = c * mkp - s * mkq;
          M[k][q] = s * mkp + c * mkq;
        }
        for (let k = 0; k < n; k++) {
          const mpk = M[p][k],
            mqk = M[q][k];
          M[p][k] = c * mpk - s * mqk;
          M[q][k] = s * mpk + c * mqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = V[k][p],
            vkq = V[k][q];
          V[k][p] = c * vkp - s * vkq;
          V[k][q] = s * vkp + c * vkq;
        }
      }
  }
  let minI = 0;
  for (let i = 1; i < n; i++) if (M[i][i] < M[minI][minI]) minI = i;
  return V.map((row) => row[minI]);
}

export function applyHomography(H: number[], p: Pt2): Pt2 {
  const w = H[6] * p.x + H[7] * p.y + H[8];
  return {
    x: (H[0] * p.x + H[1] * p.y + H[2]) / w,
    y: (H[3] * p.x + H[4] * p.y + H[5]) / w,
  };
}
