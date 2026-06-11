const fs = require('fs');
const path = require('path');

const filesToProcess = [
    'src/screens/MerchantDetailsScreen.js',
    'src/screens/LoginScreen.js',
    'src/components/MerchantUsers.js',
];

filesToProcess.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');

    // Find the last occurrence of </LinearGradient >
    const lastIndex = content.lastIndexOf('</LinearGradient >');
    if (lastIndex !== -1) {
        content = content.substring(0, lastIndex) + '</ImageBackground>' + content.substring(lastIndex + '</LinearGradient >'.length);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Replaced closing tag in: ${file}`);
    } else {
        console.log(`No closing tag found in: ${file}`);
    }
});
