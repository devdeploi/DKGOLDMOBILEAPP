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
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${file}`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Add ImageBackground to react-native imports if not present
    const importRnRegex = /import\s+{[^}]*}\s+from\s+['"]react-native['"];/g;
    content = content.replace(importRnRegex, (match) => {
        if (!match.includes('ImageBackground')) {
            return match.replace('{', '{ ImageBackground,');
        }
        return match;
    });

    // Determine the require path for the image
    const depth = file.split('/').length - 1;
    const dots = Array(depth).fill('..').join('/');
    const requirePath = `${dots}/public/assests/DKGOLDBG.png`;

    // 2. Replace the main LinearGradient with ImageBackground
    // We look for `<LinearGradient` followed by `style={styles.container}` up to `>`
    // This uses a regex to match the opening tag
    const openingTagRegex = /<LinearGradient[^>]*style={styles\.container}[^>]*>/;
    
    if (openingTagRegex.test(content)) {
        content = content.replace(openingTagRegex, `<ImageBackground source={require('${requirePath}')} style={styles.container} resizeMode="cover">`);
        
        // 3. Replace the CLOSING tag of the main LinearGradient
        // Since there might be other LinearGradients, we might need to be careful.
        // Actually, we can just replace the LAST </LinearGradient> in the file, or the one matching the end of the component.
        // Or better, let's use a simple approach: if we know the closing tag is at the bottom of the component...
        // Let's see if we can just replace all </LinearGradient> and assume if there are nested ones, it breaks?
        // Let's check how many <LinearGradient> vs </LinearGradient> there are.
        // If there's only one, we can safely replace both.
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Processed: ${file}`);
});
