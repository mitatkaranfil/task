#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules için __dirname oluştur
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Çalışma dizinini göster
console.log('Current directory:', process.cwd());
console.log('Files in directory:', fs.readdirSync('.'));

// package.json kontrol et
if (fs.existsSync('./package.json')) {
  console.log('package.json exists');
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  console.log('Vite version in package.json:', packageJson.devDependencies?.vite || 'not found');
} else {
  console.error('package.json not found');
  process.exit(1);
}

// Vite'ı yükle
try {
  console.log('Installing dependencies...');
  // Vite'ı hem normal dependencies hem de devDependencies olarak yükle
  execSync('npm install vite@5.0.12 @vitejs/plugin-react typescript --force', { stdio: 'inherit' });
  execSync('npm install vite@5.0.12 @vitejs/plugin-react typescript --save-dev --force', { stdio: 'inherit' });
  console.log('Dependencies installed successfully');
  
  // Vite'ın yüklendiğinden emin ol
  try {
    const viteVersion = execSync('npx vite --version').toString().trim();
    console.log('Installed Vite version:', viteVersion);
  } catch (versionError) {
    console.warn('Could not get Vite version, but continuing');
  }
} catch (error) {
  console.error('Error installing dependencies:', error);
  process.exit(1);
}

// Vite.config.ts dosyasını kontrol et
if (fs.existsSync('./vite.config.ts')) {
  console.log('Vite config exists at:', path.resolve('./vite.config.ts'));
  console.log('Vite config content:', fs.readFileSync('./vite.config.ts', 'utf8'));
} else {
  console.error('Vite config not found');
  process.exit(1);
}

// Client klasörünü kontrol et
if (fs.existsSync('./client')) {
  console.log('Client directory exists');
  console.log('Client directory contents:', fs.readdirSync('./client'));
} else {
  console.error('Client directory not found');
  process.exit(1);
}

// node_modules/vite dosyasını kontrol et
if (fs.existsSync('./node_modules/vite')) {
  console.log('Vite exists in node_modules');
} else {
  console.error('Vite not found in node_modules, trying to install again');
  execSync('npm install vite@5.0.12 --no-save --force', { stdio: 'inherit' });
}

// Build işlemini daha detaylı hata yakalama ile yap
try {
  console.log('Running build...');
  // Vite'ı doğrudan node_modules'dan çalıştır
  execSync('node ./node_modules/vite/bin/vite.js build', { stdio: 'inherit' });
  console.log('Build completed successfully');
} catch (error) {
  console.error('Error during build with detailed info:', error);
  // Alternative build yöntemi dene
  try {
    console.log('Trying alternative build method');
    execSync('cd client && npx vite build --outDir ../dist', { stdio: 'inherit' });
    // Çıktı dizini yoksa oluştur
    if (!fs.existsSync('./client/dist') && fs.existsSync('./dist')) {
      fs.mkdirSync('./client/dist', { recursive: true });
      // dist klasöründeki dosyaları client/dist'e kopyala
      fs.readdirSync('./dist').forEach(file => {
        fs.copyFileSync(`./dist/${file}`, `./client/dist/${file}`);
      });
    }
  } catch (altError) {
    console.error('Alternative build method also failed:', altError);
    process.exit(1);
  }
}

// Build çıktılarını kontrol et
if (fs.existsSync('./client/dist')) {
  console.log('Build output exists');
  console.log('Files in client/dist:', fs.readdirSync('./client/dist'));
} else {
  console.error('Build output not found in client/dist');
  if (fs.existsSync('./dist')) {
    console.log('Output found in root dist directory instead');
    console.log('Files in dist:', fs.readdirSync('./dist'));
    
    // Çıktı dizini yoksa oluştur
    fs.mkdirSync('./client/dist', { recursive: true });
    
    // dist klasöründeki dosyaları client/dist'e kopyala
    fs.readdirSync('./dist').forEach(file => {
      fs.copyFileSync(`./dist/${file}`, `./client/dist/${file}`);
    });
    
    console.log('Files copied from dist to client/dist');
  } else {
    console.error('No build output found anywhere');
    process.exit(1);
  }
}

console.log('Build process completed successfully'); 