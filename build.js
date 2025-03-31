#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Çalışma dizinini göster
console.log('Current directory:', process.cwd());
console.log('Files in directory:', fs.readdirSync('.'));

// Vite'ı yükle
try {
  console.log('Installing dependencies...');
  execSync('npm install --save-dev vite@5.0.12 @vitejs/plugin-react typescript', { stdio: 'inherit' });
  console.log('Dependencies installed successfully');
} catch (error) {
  console.error('Error installing dependencies:', error);
  process.exit(1);
}

// Vite.config.ts dosyasını kontrol et
if (fs.existsSync('./vite.config.ts')) {
  console.log('Vite config exists at:', path.resolve('./vite.config.ts'));
} else {
  console.error('Vite config not found');
  process.exit(1);
}

// Client klasörünü kontrol et
if (fs.existsSync('./client')) {
  console.log('Client directory exists');
} else {
  console.error('Client directory not found');
  process.exit(1);
}

// Build işlemini yap
try {
  console.log('Running build...');
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('Build completed successfully');
} catch (error) {
  console.error('Error during build:', error);
  process.exit(1);
}

// Build çıktılarını kontrol et
if (fs.existsSync('./client/dist')) {
  console.log('Build output exists');
  console.log('Files in client/dist:', fs.readdirSync('./client/dist'));
} else {
  console.error('Build output not found');
  process.exit(1);
}

console.log('Build process completed successfully'); 