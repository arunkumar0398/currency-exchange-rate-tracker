#!/bin/bash

# AnchorFX Backend - Railway Start Script

echo "Installing dependencies for the backend of the application"
cd backend && npm install

echo "Starting AnchorFX backend server..."
node server.js
