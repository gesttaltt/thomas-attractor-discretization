import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from scipy.integrate import solve_ivp
from scipy.optimize import curve_fit

# Thomas attractor system
def thomas(t, state, b):
    x, y, z = state
    dx = np.sin(y) - b * x
    dy = np.sin(z) - b * y
    dz = np.sin(x) - b * z
    return [dx, dy, dz]

# Parameters
b = 0.19
t_span = (0, 300)
t_eval = np.linspace(*t_span, 100000)  # higher resolution
initial_state = [1.0, 1.0, 1.0]

# Solve system
sol = solve_ivp(thomas, t_span, initial_state, args=(b,), t_eval=t_eval, method="RK45")

x, y, z = sol.y

# Project onto XY plane for floral analysis
r = np.sqrt(x**2 + y**2)
theta = np.arctan2(y, x)

# Rhodonea curve function
def rhodonea(theta, k, m, phi, a):
    return a * np.cos((k/m)*theta + phi)

# Fit rhodonea curve to data (sample subset for speed)
idx = np.linspace(0, len(theta)-1, 8000).astype(int)
popt, _ = curve_fit(rhodonea, theta[idx], r[idx], p0=[2, 5, 0, 1])

# Compute error
r_fit = rhodonea(theta, *popt)
E_flower = np.sqrt(np.mean((r - r_fit)**2))

# Approximate Lyapunov exponent (same crude method)
def lyapunov_estimate(b, T=200, dt=0.01):
    x1, y1, z1 = 1.0, 1.0, 1.0
    eps = 1e-8
    x2, y2, z2 = x1 + eps, y1, z1
    d0 = np.sqrt((x2-x1)**2 + (y2-y1)**2 + (z2-z1)**2)
    d_sum = 0
    n = 0
    for _ in range(int(T/dt)):
        dx1, dy1, dz1 = np.sin(y1) - b*x1, np.sin(z1) - b*y1, np.sin(x1) - b*z1
        dx2, dy2, dz2 = np.sin(y2) - b*x2, np.sin(z2) - b*y2, np.sin(x2) - b*z2
        x1, y1, z1 = x1 + dx1*dt, y1 + dy1*dt, z1 + dz1*dt
        x2, y2, z2 = x2 + dx2*dt, y2 + dy2*dt, z2 + dz2*dt
        d = np.sqrt((x2-x1)**2 + (y2-y1)**2 + (z2-z1)**2)
        if d > 0:
            d_sum += np.log(d/d0)
            d0 = d
            n += 1
    return d_sum/(n*dt) if n>0 else 0

lambda_est = lyapunov_estimate(b)
FI = (1/(1+E_flower)) * np.exp(-lambda_est)

# Prepare rhodonea curve in XY plane for overlay visualization
theta_fit = np.linspace(-np.pi, np.pi, 2000)
r_fit_curve = rhodonea(theta_fit, *popt)
x_fit = r_fit_curve * np.cos(theta_fit)
y_fit = r_fit_curve * np.sin(theta_fit)
z_fit = np.zeros_like(x_fit)

# Plot in 3D with matplotlib
fig = plt.figure(figsize=(10,8))
ax = fig.add_subplot(111, projection='3d')

# Thomas attractor (high resolution, semi-transparent)
ax.plot(x, y, z, lw=0.1, color='blue', alpha=0.05, label="Thomas attractor")

# Overlay rhodonea curve (red)
ax.plot(x_fit, y_fit, z_fit, lw=2, color='red', label="Rhodonea fit (flower symmetry)")

# Annotate FI
ax.set_title(f"Thomas Attractor with Floral Symmetry\nE_flower={E_flower:.3f}, λ≈{lambda_est:.3f}, FI≈{FI:.3f}")
ax.set_xlabel("X")
ax.set_ylabel("Y")
ax.set_zlabel("Z")
ax.legend()

plt.show()

E_flower, lambda_est, FI, popt
