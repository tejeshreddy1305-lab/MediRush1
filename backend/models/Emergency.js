// File: backend/models/Emergency.js
// Mongoose model for the Emergency Request system in MediRush

const mongoose = require("mongoose");

const EmergencySchema = new mongoose.Schema({

  // The patient who raised this emergency request
  // References the User collection — must be a valid MongoDB ObjectId
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // List of symptoms the patient reported (e.g. ["chest pain", "breathlessness"])
  // At least one symptom must be provided
  symptoms: {
    type: [String],
    required: true,
  },

  // Patient's current location as a string (e.g. "Tirupati, Andhra Pradesh")
  location: {
    type: String,
    required: true,
  },

  // Triage severity level determined by the AI engine
  // Defaults to LOW if not explicitly set
  severity: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH"],
    default: "LOW",
  },

  // The hospital assigned to handle this emergency
  // References the Hospital collection — null until a hospital is matched
  assignedHospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
    default: null,
  },

  // Current status of the emergency request in the system lifecycle
  // Starts as PENDING, moves to ASSIGNED when hospital accepts, then COMPLETED
  status: {
    type: String,
    enum: ["PENDING", "ASSIGNED", "COMPLETED"],
    default: "PENDING",
  },

  // Timestamp when this emergency was created — auto-set to current time
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Export the model so it can be imported in routes and controllers
module.exports = mongoose.model("Emergency", EmergencySchema);