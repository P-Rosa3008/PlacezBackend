const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const placeSchema = new Schema({
  title: { type: String, required: true },
  type: { type: String, required: true },
  description: { type: String, required: true },
  advancedOptions: { type: Array, required: false },
  // rating: { type: Number, required: false },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  region: { type: String },
  country: { type: String },
  creator: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
  image: { type: Array, required: true },
  date: { type: String },
});

module.exports = mongoose.model("Place", placeSchema);
