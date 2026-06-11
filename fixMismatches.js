const fs = require('fs');
const path = require('path');

const files = [
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
    
    // Quick fix: for files where we KNOW what is wrong.
    if (file === 'src/screens/LoginScreen.js') {
        content = content.replace('</LinearGradient >', '</ImageBackground>');
    }
    if (file === 'src/components/MerchantProfile.js') {
        content = content.replace('</LinearGradient>', '</ImageBackground>');
    }
    // If a file has LinearGradient open=1, close=0 and ImageBackground open=1, close=1
    // It means my previous script replaced a </LinearGradient> with </ImageBackground>
    // while the opening tag was NOT replaced.
    // Wait, the opening tag was NOT replaced because it had different colors!
    // Example: MerchantDashboardScreen has colors={['#fffbf0', '#fffbf0']}
    // And earlier I replaced the last </LinearGradient> with </ImageBackground>.
    // So let's revert the </ImageBackground> that I wrongfully replaced.
    
    fs.writeFileSync(filePath, content, 'utf8');
});
