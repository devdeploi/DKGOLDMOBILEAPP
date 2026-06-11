const fs = require('fs');
const path = require('path');

const files = [
    'src/screens/ProfileSelectScreen.js',
    'src/screens/LoginScreen.js',
    'src/components/MerchantProfile.js',
    'src/components/MerchantOverview.js',
    'src/components/dashboard/DashboardTab.js',
    'src/components/dashboard/ProfileTab.js',
    'src/components/dashboard/AnalyticsTab.js',
    'src/components/AdManager.js'
];

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Add ImageBackground to react-native imports if not present
    const importRnRegex = /import\s+{[^}]*}\s+from\s+['"]react-native['"];/g;
    content = content.replace(importRnRegex, (match) => {
        if (!match.includes('ImageBackground')) {
            return match.replace('{', '{ ImageBackground,');
        }
        return match;
    });

    const depth = file.split('/').length - 1;
    const dots = Array(depth).fill('..').join('/');
    const requirePath = `${dots}/public/assests/DKGOLDBG.png`;

    // 2. Replace opening tag
    // We want to match `<LinearGradient` followed by anything that includes the specific colors, up to `>`
    // The safest way is to replace <LinearGradient when it contains those colors.
    // We can use a regex that captures everything inside the opening tag.
    const regex = /<LinearGradient([^>]*colors={\['#(?:c1ab8eff|fffbf0|f2e07bff)'[^>]*)[^>]*>/g;
    content = content.replace(regex, (match) => {
        // We assume any such LinearGradient needs to become an ImageBackground
        // Let's keep the styles but remove colors, start, end.
        // Actually, just replace the whole tag with ImageBackground.
        let styleMatch = match.match(/style={([^}]+)}/);
        let style = styleMatch ? styleMatch[0] : 'style={styles.container}';
        return `<ImageBackground source={require('${requirePath}')} ${style} resizeMode="cover">`;
    });

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Replaced opening tags in: ${file}`);
});
