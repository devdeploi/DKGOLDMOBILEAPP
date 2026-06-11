const fs = require('fs');
const path = require('path');

const filesToProcess = [
    'src/screens/RegisterScreen.js',
    'src/screens/IntroScreen.js',
    'src/screens/ProfileSelectScreen.js',
    'src/screens/MerchantDetailsScreen.js',
    'src/screens/UserDashboardScreen.js',
    'src/screens/LoginScreen.js',
    'src/screens/MerchantDashboardScreen.js',
    'src/components/MerchantOverview.js',
    'src/components/MerchantUsers.js',
    'src/components/dashboard/DashboardTab.js',
    'src/components/dashboard/ProfileTab.js',
    'src/components/dashboard/MerchantsTab.js',
    'src/components/dashboard/AnalyticsTab.js',
];

filesToProcess.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');

    // Find the last occurrence of </LinearGradient>
    const lastIndex = content.lastIndexOf('</LinearGradient>');
    if (lastIndex !== -1) {
        content = content.substring(0, lastIndex) + '</ImageBackground>' + content.substring(lastIndex + '</LinearGradient>'.length);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Replaced closing tag in: ${file}`);
    } else {
        // Might be closed with `</LinearGradient >` or something
        console.log(`No closing tag found in: ${file}`);
    }
});
