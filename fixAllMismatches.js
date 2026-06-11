const fs = require('fs');
const path = require('path');

const filesToFix = [
    'src/screens/MerchantDashboardScreen.js',
    'src/components/MerchantOverview.js',
    'src/components/MerchantUsers.js',
    'src/components/dashboard/DashboardTab.js',
    'src/components/dashboard/ProfileTab.js',
    'src/components/dashboard/MerchantsTab.js',
    'src/components/dashboard/AnalyticsTab.js',
    'src/components/AdManager.js',
    'src/components/MerchantProfile.js'
];

filesToFix.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');

    // For MerchantProfile and AdManager
    if (file === 'src/components/MerchantProfile.js' || file === 'src/components/AdManager.js') {
        const lastIndex = content.lastIndexOf('</LinearGradient>');
        if (lastIndex !== -1) {
            content = content.substring(0, lastIndex) + '</ImageBackground>' + content.substring(lastIndex + '</LinearGradient>'.length);
        }
    } else {
        // For others, if they have ImageBackground open=1, close=1 but LinearGradient open=X, close=X-1
        // It means I mistakenly changed a </LinearGradient> to </ImageBackground> but DID NOT change the opening tag!
        // We want to make sure the root component is ImageBackground.
        // Wait, NO! I DID change the opening tag in `MerchantOverview.js` etc using the FIRST script (`replaceBg.js`),
        // where it replaced the first `<LinearGradient` that had `style={styles.container}`!
        // Let's verify this. If the file has `<ImageBackground`, I DID replace the opening tag.
        // And then I replaced the LAST `</LinearGradient>` with `</ImageBackground>` using `replaceClosing.js`.
        // BUT wait! If I did that, why are there STILL 5 LinearGradient opens and 2 closes in `MerchantOverview.js`?
        // Ah! In `MerchantOverview.js`, there were 6 `<LinearGradient>` and 6 `</LinearGradient>` initially.
        // I replaced 1 opening, so 5 opening remain.
        // I replaced 1 closing, so 5 closing SHOULD remain. BUT it says 2 closes remaining?
        // Let's check `MerchantOverview.js`.
    }
});
