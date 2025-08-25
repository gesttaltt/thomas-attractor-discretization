# Thomas Attractor — Linearized Chaos Meter (CTM) Protocol
**Scope:** Focus solely on the Thomas attractor. Derive a **chaos meter** that is as “linear” as possible—based on variational dynamics and exact system identities—*before* adding any geometric/visual layers. This spec is ready for Claude (or any teammate) to convert into code and visualizations.

---

## 0) Executive Summary
- We work with the Thomas system:
  \[
  \dot x=\sin(y)-bx,\quad \dot y=\sin(z)-by,\quad \dot z=\sin(x)-bz,\quad b>0.
  \]
- The Jacobian, divergence, and local spectrum are known in closed form. The system is dissipative with constant divergence \(\mathrm{div} f=-3b\).
- Define a **Chaos Meter for Thomas (CTM)** built only from linear/variational quantities:
  - Largest Lyapunov exponent \(\lambda_1\) (Benettin/QR method).
  - Kaplan–Yorke (Lyapunov) dimension \(D_{\mathrm{KY}}\) via \(\lambda_1+\lambda_2+\lambda_3=-3b\).
  - Combine into a normalized, adimensional index:
    \[
    C_\lambda = 1-e^{-\lambda_1/(3b)},\qquad
    C_D = \mathrm{clamp}(D_{\mathrm{KY}}-2,\ 0,\ 1),\qquad
    \boxed{\mathrm{CTM}=\sqrt{C_\lambda\cdot C_D}}.
    \]
- This yields a simple, robust, theory-aligned chaos score on \([0,1)\) for Thomas. No reliance on projections or curve-fitting.

---

## 1) Model, Linearization, and Invariants

### 1.1 Thomas system
\[
\dot x=\sin(y)-bx,\quad
\dot y=\sin(z)-by,\quad
\dot z=\sin(x)-bz,\quad b>0.
\]

### 1.2 Jacobian and divergence
\[
J(x,y,z)=
\begin{pmatrix}
-b & \cos y & 0\\
0 & -b & \cos z\\
\cos x & 0 & -b
\end{pmatrix},\qquad
\mathrm{div}\,f=\operatorname{tr}J=-3b.
\]
**Implication:** the flow is volume-contracting at a constant rate \(3b\). For Lyapunov exponents \(\{\lambda_i\}_{i=1}^3\) (ordered \(\lambda_1\ge\lambda_2\ge\lambda_3\)), the **sum identity** holds:
\[
\lambda_1+\lambda_2+\lambda_3=\langle \operatorname{tr}J\rangle = -3b.
\]
This is exact for Thomas because the divergence is constant in state space.

### 1.3 Equilibrium at the origin and local spectrum
At \((0,0,0)\) we have \(\cos 0 = 1\) and
\[
J_0=\begin{pmatrix}-b&1&0\\0&-b&1\\1&0&-b\end{pmatrix}=A-bI,\quad
A=\begin{pmatrix}0&1&0\\0&0&1\\1&0&0\end{pmatrix}.
\]
Eigenvalues of \(A\) are \(1,\,e^{\pm 2\pi i/3}=-\tfrac12\pm i\tfrac{\sqrt{3}}{2}\). Hence the eigenvalues of \(J_0\) are
\[
1-b,\quad -\Big(\tfrac12+b\Big)\pm i\,\tfrac{\sqrt{3}}{2}.
\]
For \(b=0.19\) this is \(0.81\) and \(-0.69\pm 0.866\,i\): one **unstable real** and a **stable spiral pair**. This 1\(+\)2 structure underlies the attractor geometry.

---

## 2) Variational Framework and Chaos Quantities

### 2.1 Variational (tangent) dynamics
Let \(\delta\mathbf{x}\) evolve via the linearized system \(\dot{\delta\mathbf{x}}=J(x(t))\,\delta\mathbf{x}\). Using orthonormal tangent frame vectors and periodic QR re-orthonormalization (Benettin method), we estimate Lyapunov exponents \(\lambda_i\).

### 2.2 Largest Lyapunov exponent \(\lambda_1\)
We estimate \(\lambda_1\) from accumulated logarithmic growth of the leading tangent vector, averaging over long trajectories after discarding transients.

### 2.3 Sum identity and Kaplan–Yorke dimension
Since \(\lambda_1+\lambda_2+\lambda_3=-3b\) and typically Thomas has a single positive exponent \(\lambda_1>0\) with \(\lambda_2\approx 0\) and \(\lambda_3<0\), we take \(j=2\) for the Kaplan–Yorke dimension:
\[
D_{\mathrm{KY}} = 2 + \frac{\lambda_1}{|\lambda_3|},\qquad
\lambda_3 = -3b - \lambda_1 - \lambda_2 \approx -3b - \lambda_1.
\]

### 2.4 KS-entropy
For 3D flows with a single positive exponent, the Kolmogorov–Sinai entropy is \(h_{\mathrm{KS}}=\lambda_1\). We do **not** fold it into the meter directly; it is implicit in \(C_\lambda\).

---

## 3) Thomas Chaos Meter (CTM)

### 3.1 Definition
- **Unpredictability component:**
\[
C_\lambda = 1 - \exp\!\big(-\lambda_1/(3b)\big)\in(0,1).
\]
This normalizes the expansion rate by the system’s global volume-contraction scale \(3b\).

- **Geometric-complexity component:**
\[
C_D = \mathrm{clamp}(D_{\mathrm{KY}}-2,\ 0,\ 1).
\]
In 3D, \(D_{\mathrm{KY}}\in[2,3)\) for typical chaotic regimes; subtracting 2 measures “how far beyond a 2D torus” the attractor spreads.

- **Composite chaos meter:**
\[
\boxed{\mathrm{CTM}=\sqrt{C_\lambda\cdot C_D}}.
\]
The geometric mean prevents a single term from dominating/cheating the score.

### 3.2 Example (common chaotic setting)
Take \(b=0.19\), \(\lambda_1\approx 0.103\). Then:
\[
\lambda_3\approx -3b-\lambda_1 \approx -0.57-0.103=-0.673,\quad
D_{\mathrm{KY}}\approx 2+\frac{0.103}{0.673}\approx 2.153.
\]
Hence
\[
C_\lambda=1-e^{-0.103/0.57}\approx 0.166,\quad
C_D\approx 0.153,\quad
\mathrm{CTM}\approx \sqrt{0.166\cdot 0.153}\approx 0.159.
\]
Interpretation: **moderate chaos** (positive expansion, modest extra dimension).

### 3.3 Properties
- **Adimensional**, bounded, monotone in \(\lambda_1\) and \(D_{\mathrm{KY}}\).
- Built from **linear/variational** objects + exact divergence identity—no geometric projection bias.
- **Specific to Thomas** via the natural scale \(3b\). We are *not* claiming cross-system universality here.

---

## 4) Optional Diagnostic Add‑Ons (not in CTM)
These enrich analysis but do not enter the base meter:
1. **Non‑normality gap:** \(\mu_2(J)=\lambda_{\max}((J+J^\top)/2)\) (log norm). Define
   \[
   \Delta_{\mathrm{NN}}=\langle \mu_2(J)\rangle - \lambda_1\ge 0.
   \]
   Large \(\Delta_{\mathrm{NN}}\) indicates transient growth/intermittency potential.
2. **0–1 test for chaos** (Gottwald–Mees) on \(x(t)\) as a sanity check (K≈1 chaotic).
3. **Autocorrelation/PSD** decay patterns for additional validation of regime changes.

---

## 5) Serious Calculation Protocol (pre‑coding)

### 5.1 Integration and sampling
- **Integrator:** RK4 (preferred) or Euler for quick scans (then validate with RK4).
- **Default step:** \(dt=10^{-2}\). Sensitivity check at \(dt\in[5\cdot10^{-3}, 2\cdot10^{-2}]\).
- **Total steps:** \(\ge 3\times 10^6\) (time ≥ \(3\times10^4\,dt\)).
- **Transient:** discard \(\ge 2\times 10^3\) steps before statistics.
- **Initial condition:** e.g., \((0.1,0,0)\). Sweep seeds to assess dependence.

### 5.2 Variational/QR details
- Evolve three tangent vectors with \(\dot V=J(x)V\).
- **Re‑orthonormalize** via QR every \(n_{\mathrm{GS}}\in[5,10]\) steps.
- Accumulate log‑growths to estimate \(\lambda_1\ge\lambda_2\ge\lambda_3\).
- Use **sliding FTLE windows** of \(W\in[5\times 10^3,\,10^4]\) steps to form bootstrap samples.

### 5.3 Estimators and uncertainty
- Report \(\lambda_1\pm\)CI and \(D_{\mathrm{KY}}\pm\)CI via **bootstrap over FTLE windows** (100–200 resamples).
- Propagate to \(C_\lambda,C_D,\mathrm{CTM}\) (delta method or bootstrap direct).
- Convergence checks: stability of running means, variance decay vs window size.

### 5.4 Parameter sweep (single‑param family)
- Sweep \(b\) over a grid (e.g., 0.10–0.40 by 0.01, finer near regime boundaries).
- For each \(b\): compute \(\lambda_1(b)\), \(\lambda_2(b)\), \(\lambda_3(b)\) (sum check: \(-3b\)).
- Compute \(D_{\mathrm{KY}}(b)\), \(C_\lambda(b)\), \(C_D(b)\), \(\mathrm{CTM}(b)\).
- Output curves with CI bands. Identify bands/thresholds where CTM rises/falls sharply.

### 5.5 Validation
- **0–1 test** vs. CTM(b): K should correlate with CTM.
- **Time‑locality:** track FTLE(t) and CTM(t) to observe intermittency.
- **Rotation invariance:** rotate coordinates; \(\lambda_i\) and CTM should be invariant (sanity check).

---

## 6) Recommended Defaults (for the first serious run)

| Item | Default |
|---|---|
| Integrator | RK4 |
| \(dt\) | 0.01 |
| Steps (total) | 3,000,000 |
| Transient steps | 2,000 |
| QR period \(n_{\mathrm{GS}}\) | every 5 steps |
| FTLE window \(W\) | 10,000 steps |
| Bootstrap resamples | 200 |
| Initial condition | (0.1, 0.0, 0.0) |
| \(b\) grid | 0.10 → 0.40 (Δ=0.01; refine near transitions) |

---

## 7) Outputs and Minimal JSON Schema
Even before coding, fix the output schema so results are comparable and reproducible.

```json
{
  "system": "Thomas",
  "b": 0.19,
  "dt": 0.01,
  "integrator": "RK4",
  "seed": [0.1, 0.0, 0.0],
  "steps_total": 3000000,
  "transient_steps": 2000,
  "qr_period": 5,
  "ftle_window": 10000,
  "lambda": {
    "l1": {"mean": 0.103, "ci": [0.097, 0.109]},
    "l2": {"mean": 0.000, "ci": [-0.010, 0.010]},
    "l3": {"mean": -0.673, "ci": [-0.690, -0.656]},
    "sum_check": -0.57
  },
  "D_KY": {"mean": 2.153, "ci": [2.135, 2.171]},
  "C_lambda": 0.166,
  "C_D": 0.153,
  "CTM": {"mean": 0.159, "ci": [0.150, 0.168]},
  "diagnostics": {
    "mu2_avg": null,
    "delta_NN": null,
    "K_01_test": null
  },
  "notes": "Bootstrap over FTLE windows; RK4; rotation-invariance check passed."
}
```

---

## 8) Pitfalls and Quality Guards
- **Time horizon:** Exponents converge slowly; under‑integration yields biased low \(\lambda_1\).
- **Step size:** Too large \(dt\) distorts both trajectory and variational flow; confirm with dt‑sensitivity.
- **QR frequency:** Too infrequent → tangents align and lose rank; too frequent → overhead. Every 5–10 steps is a good compromise.
- **Intermittency:** Use FTLE windows and bootstrap to capture variance; report CI, not just point estimates.
- **Seed dependence:** Check a few seeds to ensure robustness (statistics should agree within CI).

---

## 9) Roadmap After CTM Is Validated
Once CTM is stable and validated vs. b‑sweeps and 0–1 test:
1. Add **geometric layers** (your Flower Index, spectral rose power \(R_p\), TDA) **as diagnostics**, not as the core meter.
2. Build **real‑time visualizations**: show CTM(t), FTLE(t) and link sudden drops/spikes to regime changes.
3. Only then generalize the meter family to other attractors (Rossler, Lorenz), re‑scaling the \(C_\lambda\) normalization appropriately.

---

## 10) Quick Interpretation Guide
- **CTM ≲ 0.05**: near‑regular or weak chaos; little extra dimension above 2D; \(\lambda_1\) small.  
- **CTM ≈ 0.10–0.25**: **moderate chaos** (typical Thomas at \(b\approx 0.19\)).  
- **CTM ≳ 0.25**: strong chaos (if reachable by parameter choice), higher \(D_{\mathrm{KY}}\) and larger \(\lambda_1\).

---

### Final Note
CTM is deliberately **Thomas‑specific**, anchored in \(-3b\). It is not a claim of universality; it’s a yardstick tailored to this system that respects the linear backbone of chaos: variational growth vs. global contraction. Once we lock this down empirically, we can layer richer geometry without losing scientific spine.
