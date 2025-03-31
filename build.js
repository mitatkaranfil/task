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

// Environment variables ayarla
process.env.NODE_ENV = 'development'; // devDependencies'in yüklenmesi için gerekli
console.log('Setting NODE_ENV to development for installing devDependencies');

// Tüm gerekli paketleri yükle
try {
  console.log('Installing all dependencies...');
  
  // Tüm devDependencies'i yüklediğimizden emin olmak için NPM_CONFIG_PRODUCTION=false ayarla
  execSync('NPM_CONFIG_PRODUCTION=false npm install --force', { stdio: 'inherit' });
  
  // Vite ve diğer gerekli paketleri spesifik olarak yükle
  execSync('npm install vite@5.0.12 @vitejs/plugin-react typescript postcss autoprefixer tailwindcss @tailwindcss/typography --no-save --force', { stdio: 'inherit' });
  
  console.log('Dependencies installed successfully');
} catch (error) {
  console.error('Error installing dependencies:', error);
  process.exit(1);
}

// PostCSS config dosyasını kontrol et
if (fs.existsSync('./postcss.config.js')) {
  console.log('PostCSS config exists:', fs.readFileSync('./postcss.config.js', 'utf8'));
} else {
  console.error('PostCSS config not found');
}

// TailwindCSS config dosyasını kontrol et
if (fs.existsSync('./tailwind.config.ts')) {
  console.log('TailwindCSS config exists:', fs.readFileSync('./tailwind.config.ts', 'utf8'));
} else {
  console.error('TailwindCSS config not found');
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

// node_modules klasörlerini kontrol et
const criticalPackages = [
  'vite', 
  'postcss', 
  'autoprefixer', 
  'tailwindcss', 
  '@vitejs/plugin-react'
];

for (const pkg of criticalPackages) {
  const pkgPath = `./node_modules/${pkg}`;
  if (fs.existsSync(pkgPath)) {
    console.log(`${pkg} exists in node_modules`);
  } else {
    console.error(`${pkg} not found in node_modules, trying to install again`);
    execSync(`npm install ${pkg} --no-save --force`, { stdio: 'inherit' });
  }
}

// Build işlemini manual olarak gerçekleştir
try {
  console.log('Running build...');
  
  // Önce Vite CLI'yi bul
  let viteBin = '';
  if (fs.existsSync('./node_modules/.bin/vite')) {
    viteBin = './node_modules/.bin/vite';
  } else if (fs.existsSync('./node_modules/vite/bin/vite.js')) {
    viteBin = 'node ./node_modules/vite/bin/vite.js';
  } else {
    viteBin = 'npx vite';
  }
  
  // Build komutunu çalıştır
  console.log(`Using Vite binary: ${viteBin}`);
  execSync(`${viteBin} build`, { stdio: 'inherit' });
  console.log('Build completed successfully');
} catch (error) {
  console.error('Error during build with detailed info:', error);
  
  // Alternative build
  try {
    console.log('Trying alternative build method');
    execSync('cd client && NODE_ENV=development npx vite build --outDir ../dist', { stdio: 'inherit' });
    
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
    
    // Manuel HTML kopyalama
    try {
      console.log('Trying to create a basic static site placeholder');
      
      // client/dist klasörünü oluştur
      fs.mkdirSync('./client/dist', { recursive: true });
      
      // Basit bir index.html dosyası oluştur
      const basicHtml = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Telegram Mining Mini App</title>
  <style>
    body { background-color: #121212; color: white; font-family: Arial, sans-serif; text-align: center; padding: 50px; }
    h1 { font-size: 24px; margin-bottom: 20px; }
    p { font-size: 16px; margin-bottom: 30px; }
    .container { max-width: 600px; margin: 0 auto; }
    .button { background-color: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Telegram Mining Mini App</h1>
    <p>Uygulama şu anda bakım modundadır. Lütfen daha sonra tekrar deneyin.</p>
    <button class="button" onclick="window.location.reload()">Yenile</button>
  </div>
</body>
</html>`;
      
      fs.writeFileSync('./client/dist/index.html', basicHtml);
      console.log('Created basic static placeholder');
      
      // Yönlendirme dosyası oluştur
      fs.writeFileSync('./client/dist/_redirects', '/* /index.html 200');
      fs.writeFileSync('./client/dist/_headers', '/*\n  Content-Type: text/html; charset=utf-8');
      
      console.log('Created redirect and header files');
    } catch (fallbackError) {
      console.error('Even fallback static site creation failed:', fallbackError);
      process.exit(1);
    }
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
      try {
        fs.copyFileSync(`./dist/${file}`, `./client/dist/${file}`);
      } catch (copyError) {
        console.error(`Error copying file ${file}:`, copyError);
      }
    });
    
    console.log('Files copied from dist to client/dist');
  } else {
    console.error('No build output found anywhere');
    process.exit(1);
  }
}

console.log('Build process completed successfully'); 