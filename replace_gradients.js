const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('/Users/apple/DKGOLD/DKGOLDMOBILEAPP/src');

let count = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('LinearGradient')) {
        content = content.replace(/import LinearGradient from 'react-native-linear-gradient';\n?/g, '');
        content = content.replace(/<LinearGradient/g, '<View');
        content = content.replace(/<\/LinearGradient>/g, '</View>');
        content = content.replace(/\s+colors=\{[^}]+\}/g, '');
        content = content.replace(/\s+start=\{[^}]+\}/g, '');
        content = content.replace(/\s+end=\{[^}]+\}/g, '');
        fs.writeFileSync(file, content);
        console.log('Processed', file);
        count++;
    }
});
console.log('Total files modified:', count);
