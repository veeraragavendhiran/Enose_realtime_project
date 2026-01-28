const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let hardwareConnected = false; // Toggle this if real serial port hardware is plugged in
let currentDiseaseState = "Healthy";

// A simulated sensor data generator
function generateSimulatedData() {
  const baseLine = {
    "Healthy": { mq3: 10, mq4: 15, mq135: 20, mq8: 12 },
    "Bacterial Blight": { mq3: 45, mq4: 20, mq135: 85, mq8: 30 },
    "Fungal Infection": { mq3: 20, mq4: 50, mq135: 40, mq8: 15 }
  };

  const target = baseLine[currentDiseaseState];
  
  // Add some realistic noise
  return {
    timestamp: new Date().toISOString(),
    status: currentDiseaseState,
    sensors: {
      mq3: target.mq3 + (Math.random() * 4 - 2),
      mq4: target.mq4 + (Math.random() * 4 - 2),
      mq135: target.mq135 + (Math.random() * 4 - 2),
      mq8: target.mq8 + (Math.random() * 4 - 2)
    }
  };
}

io.on('connection', (socket) => {
  console.log('Dashboard connected:', socket.id);

  // Interval to push data to the frontend
  const dataInterval = setInterval(() => {
    if (!hardwareConnected) {
      // Send simulated data
      const data = generateSimulatedData();
      socket.emit('sensor_data', data);
    } else {
      // In a real scenario, you'd read from a SerialPort here and emit the real data
      // socket.emit('sensor_data', realHardwareData);
    }
  }, 1000); // 1 Hz update rate

  // Allow the dashboard to trigger state changes for simulation demonstration
  socket.on('set_disease_state', (state) => {
    if (["Healthy", "Bacterial Blight", "Fungal Infection"].includes(state)) {
      currentDiseaseState = state;
      console.log(`Simulation state changed to: ${state}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Dashboard disconnected:', socket.id);
    clearInterval(dataInterval);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`E-Nose Node.js API Hub running on port ${PORT}`);
  console.log(`Simulated Hardware Mode: ${!hardwareConnected}`);
});
