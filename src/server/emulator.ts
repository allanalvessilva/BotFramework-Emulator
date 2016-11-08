import { BotFrameworkService } from './botFrameworkService';
import { ConversationManager } from './conversationManager';
import * as Settings from './settings';
import * as Electron from 'electron';
import { mainWindow } from './main';


/**
 * Top-level state container for the Node process.
 */
export class Emulator {
    mainWindow: Electron.BrowserWindow;
    framework = new BotFrameworkService();
    conversations = new ConversationManager();

    constructor() {
        // When the client notifies us it has started up, send it the configuration.
        // Note: We're intentionally sending and ISettings here, not a Settings. This
        // is why we're getting the value from getStore().getState().
        Electron.ipcMain.on('clientStarted', () => {
            this.mainWindow = mainWindow;
            this.send('serverSettings', Settings.getStore().getState());
        });
        Settings.addSettingsListener(() => {
            this.send('serverSettings', Settings.getStore().getState());
        });
    }

    /**
     * Loads settings from disk and then creates the emulator.
     */
    static startup() {
        Settings.startup();
        emulator = new Emulator();
    }

    /**
     * Sends a command to the client.
     */
    send(channel: string, ...args: any[]) {
        if (this.mainWindow) {
            this.mainWindow.webContents.send(channel, args);
        }
    }
}

export let emulator: Emulator;
