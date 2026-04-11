export const COLORS = {
    primary: '#915200',
    primaryDark: '#7a4400',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#343a40',
    white: '#ffffff',
    white50: 'rgba(255, 255, 255, 0.5)',
    glass: 'rgba(255, 255, 255, 0.85)',
    glassBorder: 'rgba(255, 255, 255, 0.4)',
    backgroundGradient: ['#915200', '#7a4400'],
    textPrimary: '#915200',
    textSecondary: 'rgba(145, 82, 0, 0.7)',
    inputBackground: 'rgba(255, 255, 255, 0.5)',
    backgroundSecondary: '#f1f1f1'
};

export const FONTS = {
    regular: 'System',
    bold: 'bold'
};

// Ensure global availability to resolve ReferenceErrors in some environments
if (typeof global !== 'undefined') {
    global.COLORS = COLORS;
    global.FONTS = FONTS;
}

export default { COLORS, FONTS };
