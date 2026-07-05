import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileItem } from '@/types/fileExplorer';
import { FileIcon } from './FileIcon';
import { formatFileSize, fileSystem } from '@/data/mockFileSystem';
import { useI18n } from '@/i18n/LanguageContext';

interface Props {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
}

function buildFullPath(id: string): string {
  const parts: string[] = [];
  let current: FileItem | undefined = fileSystem[id];
  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? fileSystem[current.parentId] : undefined;
  }
  return parts.join(' \\ ');
}

export function PropertiesDialog({ file, open, onOpenChange, displayName }: Props) {
  const { t, locale } = useI18n();
  if (!file) return null;

  const fmt = (d: Date) =>
    d.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  const childCount = file.type === 'folder' ? file.children?.length || 0 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md glass-menu border-border/40">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-[14px] font-normal">
            <FileIcon type={file.type} extension={file.extension} name={displayName} size={32} />
            <span className="truncate">{t('props.title')} : {displayName}</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-2">
          <TabsList className="grid grid-cols-4 h-8 bg-[hsl(var(--muted))]">
            <TabsTrigger value="general" className="text-[11px]">{t('props.general')}</TabsTrigger>
            <TabsTrigger value="details" className="text-[11px]">{t('props.details')}</TabsTrigger>
            <TabsTrigger value="security" className="text-[11px]">{t('props.security')}</TabsTrigger>
            <TabsTrigger value="versions" className="text-[11px]">{t('props.versions')}</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-2 mt-3 text-[12px] font-light">
            <Row label={t('props.name')} value={displayName} />
            <Row label={t('preview.type')} value={t(`filetype.${file.type}`)} />
            {file.extension && <Row label={t('preview.extension')} value={`.${file.extension}`} />}
            <Row label={t('preview.location')} value={buildFullPath(file.id)} mono />
            {file.type !== 'folder' && file.size !== undefined && (
              <Row label={t('preview.size')} value={`${formatFileSize(file.size)}  (${file.size.toLocaleString()} ${t('props.bytes')})`} />
            )}
            {file.type === 'folder' && (
              <Row label={t('preview.contents')} value={`${childCount} ${t(childCount !== 1 ? 'status.items_plural' : 'status.items')}`} />
            )}
            <div className="h-px bg-border/40 my-2" />
            <Row label={t('preview.created')} value={fmt(file.dateCreated)} />
            <Row label={t('preview.modified')} value={fmt(file.dateModified)} />
            <Row label={t('props.accessed')} value={fmt(file.dateModified)} />
          </TabsContent>

          <TabsContent value="details" className="space-y-2 mt-3 text-[12px] font-light">
            <Row label={t('props.attribute')} value={file.isHidden ? t('props.hidden') : t('props.normal')} />
            <Row label={t('props.readOnly')} value={file.isReadOnly ? t('props.yes') : t('props.no')} />
            <Row label={t('props.owner')} value="Utilisateur\\me" mono />
            {file.tags?.length ? <Row label={t('preview.tags')} value={file.tags.join(', ')} /> : null}
          </TabsContent>

          <TabsContent value="security" className="mt-3 text-[12px] font-light text-muted-foreground">
            <p>{t('props.securityNote')}</p>
            <div className="mt-2 space-y-1">
              <Row label="SYSTEM" value={t('props.fullControl')} />
              <Row label="Administrators" value={t('props.fullControl')} />
              <Row label="Users" value={t('props.readExecute')} />
            </div>
          </TabsContent>

          <TabsContent value="versions" className="mt-3 text-[12px] font-light text-muted-foreground">
            <p>{t('props.noVersions')}</p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground w-24 shrink-0 text-[11px]">{label}</span>
      <span className={`flex-1 break-all ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</span>
    </div>
  );
}
