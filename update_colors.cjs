const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Replace colors to match the presentation (Cyan and Amber/Gold)
  content = content.replace(/emerald/g, 'cyan');
  content = content.replace(/yellow/g, 'amber');
  // Make the background deeper/colder (Slate instead of Neutral)
  content = content.replace(/neutral-950/g, 'slate-950');
  content = content.replace(/neutral-900/g, 'slate-900');
  content = content.replace(/neutral-800/g, 'slate-800');
  fs.writeFileSync(filePath, content, 'utf8');
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  }
}

walk('./src');
console.log('Colors updated to Cyan/Amber Anime HUD style');
