#!/usr/bin/env node
/**
 * Seed script — creates a test user and uploads a sample document.
 * Useful for getting started without clicking through the UI.
 *
 * Usage:
 *   node scripts/seed.js
 *
 * Requires MONGODB_URI in your .env
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const User = require('../src/models/User').default;

  const existing = await User.findOne({ email: 'demo@smartdoc.dev' });
  if (existing) {
    console.log('Demo user already exists — skipping');
    process.exit(0);
  }

  const hash = await bcrypt.hash('demo1234', 10);
  await User.create({
    name: 'Demo User',
    email: 'demo@smartdoc.dev',
    password: hash,
  });

  console.log('Created demo user: demo@smartdoc.dev / demo1234');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
