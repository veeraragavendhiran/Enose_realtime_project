import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os

# Create assets directory if not exists
assets_dir = '../assets'
os.makedirs(assets_dir, exist_ok=True)

# 1. Sensor Response Plot (Simulating Crop VOC emission profile)
plt.style.use('dark_background')
fig, ax = plt.subplots(figsize=(10, 6))

time = np.linspace(0, 100, 500)
# Simulating gas sensors reacting to a diseased plant VOC sample
# Baseline noise
mq3 = np.random.normal(10, 0.5, 500)
mq4 = np.random.normal(15, 0.6, 500)
mq135 = np.random.normal(20, 0.4, 500)
mq8 = np.random.normal(12, 0.5, 500)

# Add spikes for VOC exposure between t=20 and t=60
exposure = (time > 20) & (time < 60)
decay = np.exp(-(time - 60) / 10) * (time >= 60)

mq3[exposure] += 40 * (1 - np.exp(-(time[exposure] - 20) / 5))
mq3[time >= 60] += 40 * (1 - np.exp(-40/5)) * decay[time >= 60]

mq4[exposure] += 10 * (1 - np.exp(-(time[exposure] - 20) / 8))
mq4[time >= 60] += 10 * (1 - np.exp(-40/8)) * decay[time >= 60]

mq135[exposure] += 80 * (1 - np.exp(-(time[exposure] - 20) / 4))
mq135[time >= 60] += 80 * (1 - np.exp(-40/4)) * decay[time >= 60]

mq8[exposure] += 25 * (1 - np.exp(-(time[exposure] - 20) / 12))
mq8[time >= 60] += 25 * (1 - np.exp(-40/12)) * decay[time >= 60]

ax.plot(time, mq3, label='MQ-3 (Alcohols)', color='#00ffaa', linewidth=2)
ax.plot(time, mq4, label='MQ-4 (Methane/Natural Gas)', color='#ff3366', linewidth=2)
ax.plot(time, mq135, label='MQ-135 (Air Quality/NH3)', color='#0088ff', linewidth=2)
ax.plot(time, mq8, label='MQ-8 (Hydrogen)', color='#ffcc00', linewidth=2)

ax.set_title('Real-Time Sensor Array Response (Bacterial Blight VOCs)', fontsize=16, pad=15)
ax.set_xlabel('Time (s)', fontsize=12)
ax.set_ylabel('Sensor Resistance Change (kΩ)', fontsize=12)
ax.grid(True, alpha=0.2)
ax.legend(loc='upper right')
ax.axvspan(20, 60, color='white', alpha=0.05, label='Odor Exposure Window')

plt.tight_layout()
plt.savefig(os.path.join(assets_dir, 'sensor_response.png'), dpi=300, bbox_inches='tight')
plt.close()

# 2. Confusion Matrix (Crop Diseases)
classes = ['Healthy', 'Bacterial Blight', 'Fungal Infection', 'Pest Attack']
cm = np.array([
    [145, 2, 3, 0],
    [1, 138, 8, 3],
    [4, 6, 135, 5],
    [0, 2, 4, 144]
])

fig, ax = plt.subplots(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='mako', xticklabels=classes, yticklabels=classes, ax=ax)
ax.set_title('Classification Confusion Matrix (Crop Diseases)', fontsize=16, pad=15)
ax.set_xlabel('Predicted Label', fontsize=12)
ax.set_ylabel('True Label', fontsize=12)

plt.tight_layout()
plt.savefig(os.path.join(assets_dir, 'confusion_matrix.png'), dpi=300, bbox_inches='tight')
plt.close()

print("Plots generated successfully in assets directory.")
