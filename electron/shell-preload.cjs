const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cognitiveWindow', {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  openFolder: (folderId) => ipcRenderer.send('window:open-folder', folderId),
});
