#!/usr/bin/env node

/**
 * Master startup script that runs both the server and listener together
 * This ensures:
 * 1. Express server is running to handle API requests and serve frontend
 * 2. Event listener is running to detect burn events and grant download access
 */

const { spawn } = require("child_process");
const path = require("path");

console.log("🚀 Starting MYRAD DataCoin Platform...\n");

// Start the Express server
console.log("📡 Starting API Server...");
const server = spawn("node", [path.join(__dirname, "server.js")], {
  stdio: "inherit",
  env: process.env
});

server.on("error", (err) => {
  console.error("❌ Server error:", err);
  process.exit(1);
});

server.on("exit", (code) => {
  console.error(`❌ Server exited with code ${code}`);
  process.exit(code);
});

// Start the Event listener
console.log("👀 Starting Event Listener...");
const listener = spawn("node", [path.join(__dirname, "listener.js")], {
  stdio: "inherit",
  env: process.env
});

listener.on("error", (err) => {
  console.error("❌ Listener error:", err);
  // Don't exit on listener error - let server continue
});

listener.on("exit", (code) => {
  console.warn(`⚠️  Listener exited with code ${code} - restarting...`);
  // Restart listener if it crashes
  setTimeout(() => {
    const newListener = spawn("node", [path.join(__dirname, "listener.js")], {
      stdio: "inherit",
      env: process.env
    });
    newListener.on("exit", (newCode) => {
      console.warn(`⚠️  Listener exited again with code ${newCode}`);
    });
  }, 5000);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n⏸️  Shutting down gracefully...");
  server.kill("SIGTERM");
  listener.kill("SIGTERM");
  
  setTimeout(() => {
    console.log("✅ Shutdown complete");
    process.exit(0);
  }, 2000);
});

console.log("\n✅ Platform startup initiated");
console.log("   - API Server: http://localhost:4000");
console.log("   - Event Listener: Running in background");
console.log("   - Frontend: http://localhost:4000");
console.log("\n🎯 Ready for testing! Press Ctrl+C to stop.\n");
