const fs = require('fs');
const path = require('path');

const files = [
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
    'src/components/MerchantProfile.js',
    'src/components/AdManager.js'
];

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    const bgOpen = (content.match(/<ImageBackground/g) || []).length;
    const bgClose = (content.match(/<\/ImageBackground>/g) || []).length;
    
    const lgOpen = (content.match(/<LinearGradient/g) || []).length;
    const lgClose = (content.match(/<\/LinearGradient\s*>/g) || []).length;
    
    if (bgOpen !== bgClose || lgOpen !== lgClose) {
        console.log(`Mismatch in ${file}:`);
        console.log(`  ImageBackground: open=${bgOpen}, close=${bgClose}`);
        console.log(`  LinearGradient: open=${lgOpen}, close=${lgClose}`);
    }
});
