// Single source of truth mapping any cloud/network "provider" or source type
// to a LocationKey consumed by <LocationIcon> / iconResolver. Every UI surface
// (sidebar, network page, NewConnectionDialog, DriveOverview, ...) MUST go
// through this mapper so an icon change happens in one place.

import type { LocationKey } from './iconResolver';

export type ProviderId =
  | 'gdrive' | 'onedrive' | 'dropbox' | 'box' | 'icloud'
  | 'webdav' | 's3' | 'ftp' | 'ftps' | 'sftp' | 'smb' | 'nas'
  | 'cloud' | 'network' | 'local' | 'host' | string;

const MAP: Record<string, LocationKey> = {
  gdrive: 'googleDrive',
  googledrive: 'googleDrive',
  'google-drive': 'googleDrive',
  onedrive: 'oneDrive',
  dropbox: 'dropbox',
  box: 'box',
  icloud: 'icloud',
  webdav: 'webdav',
  s3: 's3',
  aws: 's3',
  minio: 's3',
  ftp: 'ftp',
  ftps: 'ftps',
  sftp: 'sftp',
  smb: 'smb',
  cifs: 'smb',
  nas: 'nas',
  synology: 'nas',
  qnap: 'nas',
  github: 'host',
  cloud: 'cloud',
  network: 'network',
  host: 'host',
};

// Ordered name regexes — first match wins. Order matters: more specific first.
const NAME_REGEX: [RegExp, LocationKey][] = [
  [/google.*drive|g[-_]?drive/i, 'googleDrive'],
  [/one[-_ ]?drive/i, 'oneDrive'],
  [/dropbox/i, 'dropbox'],
  [/\bbox\b/i, 'box'],
  [/i[-_ ]?cloud/i, 'icloud'],
  [/mega(?:\.nz|sync)?/i, 'cloud'],
  [/pcloud/i, 'cloud'],
  [/webdav|nextcloud|owncloud/i, 'webdav'],
  [/\b(aws|s3|minio|wasabi|backblaze|b2)\b/i, 's3'],
  [/\b(nas|synology|qnap|truenas|freenas|unraid)\b/i, 'nas'],
  [/\b(sftp)\b/i, 'sftp'],
  [/\b(ftps)\b/i, 'ftps'],
  [/\b(ftp)\b/i, 'ftp'],
  [/\b(smb|cifs|samba)\b/i, 'smb'],
  [/github/i, 'host'],
];

export function providerLocationKey(
  provider?: string | null,
  fallbackType?: string | null,
  name?: string | null,
): LocationKey {
  const p = (provider || '').toLowerCase();
  if (p && MAP[p]) return MAP[p];
  const t = (fallbackType || '').toLowerCase();
  if (t && MAP[t]) return MAP[t];

  // Name-based inference (e.g. drive labeled "Google Drive", "MyNAS", "iCloud").
  const n = (name || '').trim();
  if (n) {
    for (const [re, key] of NAME_REGEX) if (re.test(n)) return key;
  }

  if (t === 'ftp') return 'ftp';
  if (t === 'network') return 'network';
  if (t === 'cloud') return 'cloud';
  return 'host';
}

export function providerLabel(provider?: string | null): string {
  const p = (provider || '').toLowerCase();
  const map: Record<string, string> = {
    gdrive: 'Google Drive', onedrive: 'OneDrive', dropbox: 'Dropbox',
    box: 'Box', icloud: 'iCloud Drive', webdav: 'WebDAV', s3: 'S3',
    ftp: 'FTP', ftps: 'FTPS', sftp: 'SFTP', smb: 'SMB', nas: 'NAS',
    github: 'GitHub',
  };
  return map[p] || (provider || '').toString();
}
