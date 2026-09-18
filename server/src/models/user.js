const { Schema, model } = require('mongoose');

const FamilyContactSchema = new Schema({
  name: String,
  phone: String,
  pinCode: String,
  relationship: String,
  regionCode: String,
  lat: Number,
  lng: Number,
}, { _id: true });

const UserSchema = new Schema({
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  name: String,
  phone: String,
  homeLat: Number,
  homeLng: Number,
  homeRegionCode: String,
  expoPushToken: String,
  familyWatchList: [FamilyContactSchema],
  createdAt: { type: Date, default: Date.now },
});

module.exports = model('User', UserSchema);