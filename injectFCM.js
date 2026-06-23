import fs from 'fs';

const filePath = './src/services/FCMService.js';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add imports
content = content.replace("import { APIURL } from '../constants/api';", "import { APIURL, BASE_URL } from '../constants/api';\nimport RNFS from 'react-native-fs';");

// 2. Add handleBackgroundDataMessage
const functionString = `
    async handleBackgroundDataMessage(remoteMessage) {
        if (remoteMessage?.data?.type === 'pdf_export_progress') {
            const progress = parseInt(remoteMessage.data.progress, 10);
            
            if (progress >= 0 && progress < 100) {
                // Show progress bar
                await notifee.displayNotification({
                    id: 'pdf_export',
                    title: 'Exporting PDF',
                    body: 'Your payment report is being generated...',
                    android: {
                        channelId: 'default',
                        onlyAlertOnce: true,
                        progress: {
                            max: 100,
                            current: progress,
                        },
                    },
                });
            } else if (progress === 100) {
                // Download file
                const downloadUrl = remoteMessage.data.downloadUrl;
                if (downloadUrl) {
                    const fullUrl = \`\${BASE_URL}\${downloadUrl}\`;
                    const cleanFileName = \`Payment_Report_\${new Date().getTime()}\`;
                    const downloadPath = \`\${RNFS.DownloadDirectoryPath}/\${cleanFileName}.pdf\`;

                    try {
                        await notifee.displayNotification({
                            id: 'pdf_export',
                            title: 'Downloading PDF',
                            body: 'Saving to your device...',
                            android: {
                                channelId: 'default',
                                onlyAlertOnce: true,
                                progress: { indeterminate: true },
                            },
                        });

                        await RNFS.downloadFile({
                            fromUrl: fullUrl,
                            toFile: downloadPath,
                        }).promise;

                        // Final Notification
                        await notifee.displayNotification({
                            id: 'pdf_export',
                            title: 'Export Complete',
                            body: 'Payment report has been saved to your Downloads folder. Tap to view.',
                            android: {
                                channelId: 'default',
                                pressAction: {
                                    id: 'default',
                                },
                            },
                        });
                    } catch (err) {
                        console.error('Failed to download PDF:', err);
                        await notifee.displayNotification({
                            id: 'pdf_export',
                            title: 'Export Failed',
                            body: 'Could not download the generated PDF.',
                            android: { channelId: 'default' },
                        });
                    }
                }
            } else if (progress < 0) {
                await notifee.displayNotification({
                    id: 'pdf_export',
                    title: 'Export Failed',
                    body: 'There was an error generating the PDF on the server.',
                    android: { channelId: 'default' },
                });
            }
        } else {
            await this.onMessageReceived(remoteMessage);
        }
    }
`;

content = content.replace("async onMessageReceived(remoteMessage) {", functionString + "\n    async onMessageReceived(remoteMessage) {");

// Also replace onMessageReceived inside registerForegroundHandler to use handleBackgroundDataMessage for data messages too
content = content.replace("await this.onMessageReceived(remoteMessage);", "await this.handleBackgroundDataMessage(remoteMessage);");

fs.writeFileSync(filePath, content);
console.log('Successfully injected handleBackgroundDataMessage into FCMService.js');
