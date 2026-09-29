import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';

const svg = fs.readFileSync('web/public/favicon.svg', 'utf8');

// 1. Transparent 512x512
const resvg512 = new Resvg(svg, { fitTo: { mode: 'width', value: 512 } });
const png512 = resvg512.render().asPng();
fs.writeFileSync('web/public/cortex-app-icon-512.png', png512);
fs.writeFileSync('web/public/cortex-app-icon.png', png512);
fs.writeFileSync('web/public/cortex-slack-app-icon.png', png512);
fs.writeFileSync('web/public/cortex-github-app-icon.png', png512);
fs.writeFileSync('web/public/cortex-jira-app-icon.png', png512);

// 2. Ultra-HD 1024x1024
const resvg1024 = new Resvg(svg, { fitTo: { mode: 'width', value: 1024 } });
const png1024 = resvg1024.render().asPng();
fs.writeFileSync('web/public/cortex-app-icon-1024.png', png1024);

// 3. Solid background version (filling entire 512x512 canvas with dark obsidian #070B14)
const solidSvg = svg.replace('<rect x="6" y="6"', '<rect width="100" height="100" fill="#070B14" /><rect x="6" y="6"');
const resvgSolid = new Resvg(solidSvg, { fitTo: { mode: 'width', value: 512 } });
const pngSolid = resvgSolid.render().asPng();
fs.writeFileSync('web/public/cortex-app-icon-solid.png', pngSolid);

console.log('✅ Successfully generated all official Cortex logo icons!');
console.log('512x512 size:', (png512.length / 1024).toFixed(1), 'KB');
console.log('1024x1024 size:', (png1024.length / 1024).toFixed(1), 'KB');
console.log('Solid 512x512 size:', (pngSolid.length / 1024).toFixed(1), 'KB');
