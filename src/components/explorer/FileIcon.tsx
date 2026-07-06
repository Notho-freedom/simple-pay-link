import { FileType } from '@/types/fileExplorer';
import { HDIcon } from './icons/HDIcon';
import type { IconDescriptor, LocationKey } from '@/lib/iconResolver';
import onedrive from '@/assets/onedrive.svg';
import ftp from '@/assets/ftp.png';
import dropbox from '@/assets/dropbox.svg';
import cloud from '@/assets/cloud.svg';
import host from '@/assets/host.png';
import aws from '@/assets/aws.svg';
interface FileIconProps {
  type: FileType;
  extension?: string;
  name?: string;
  path?: string;
  size?: number;
  className?: string;
}

export function FileIcon({ type, extension, name, path, size = 24, className = '' }: FileIconProps) {
  const descriptor: IconDescriptor = { kind: 'file', type, extension, name, path };
  return <HDIcon descriptor={descriptor} size={size} alt={name || type} className={className} />;
}

export function LocationIcon({ locationKey, path, size = 24, className = '', alt }: {
  locationKey: LocationKey; path?: string; size?: number; className?: string; alt?: string;
}) {
  return <HDIcon descriptor={{ kind: 'location', key: locationKey, path }} size={size} alt={alt || locationKey} className={className} />;
}

// Backwards-compat URL maps for legacy explorer components that still pass
// raw `src=` strings to <HDIcon>. New code should use <LocationIcon /> /
// <FileIcon /> which go through the async resolver.
import * as FB from './icons/iconFallbacks';
export const sidebarIcons = {
  thisPC: FB.fbThisPC,
  driveSystem: FB.fbDriveSystem,
  driveData: FB.fbDrive,
  driveBackup: FB.fbFolderArchive,
  driveSSD: FB.fbDrive,
  usb: FB.fbUSB,
  googleDrive: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg',
  oneDrive: onedrive,
  dropbox: dropbox,
  cloud: cloud,
  nas: FB.fbFolderServer,
  ftp: ftp,
  network: FB.fbNetwork,
  phone: FB.fbPhone,
  trashEmpty: FB.fbTrash,
  trashFull: FB.fbTrash,
  desktop: FB.fbFolderDesktop,
  downloads: FB.fbFolderDownload,
  documents: FB.fbFolderResource,
  pictures: FB.fbFolderImages,
  music: FB.fbFolderAudio,
  videos: FB.fbFolderVideo,
  folder: FB.fbFolder,
  folderOpen: FB.fbFolderOpen,
  host: host,
  aws: aws,
  box: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/box.svg',
  icloud: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/ICloud_logo.svg',
  webdav: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/webdav.svg',
};
export const sidebarFallbacks = sidebarIcons;
export const sidebarEmojis = {
  thisPC: '🖥️', drive: '💾', usb: '🔌', cloud: '☁️', network: '🌐',
  trash: '🗑️', phone: '📱', folder: '📂', home: '🏠',
};
