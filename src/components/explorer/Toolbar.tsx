import { ArrowLeft, ArrowRight, ArrowUp, ChevronRight, Search, LayoutGrid, GalleryHorizontalEnd, PanelRight, Scissors, Copy, Clipboard, Trash2, PenLine, SlidersHorizontal, GripHorizontal, LayoutList, Table2, RefreshCw, Eye, FileText, Columns3, Columns2, MoreHorizontal, TerminalSquare, PlugZap } from 'lucide-react';
import { NewMenu } from './NewMenu';
import { ViewMode, SortField } from '@/types/fileExplorer';
import { useI18n } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useEffect, useRef } from 'react';
import { useSound } from '@/hooks/useSound';

interface Props {
  path: string[];
  viewMode: ViewMode;
  searchQuery: string;
  showPreview: boolean;
  showHidden: boolean;
  showExtensions: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  canGoUp: boolean;
  selectedCount: number;
  hasClipboard: boolean;
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  onGoBack: () => void;
  onGoForward: () => void;
  onGoUp: () => void;
  onNavigatePath: (index: number) => void;
  onViewChange: (mode: ViewMode) => void;
  onSearch: (q: string) => void;
  onTogglePreview: () => void;
  onToggleHidden: () => void;
  onToggleExtensions: () => void;
  onSort: (field: SortField) => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onNewFolder: () => void;
  onNewFile: (kind: 'txt' | 'docx' | 'xlsx' | 'pptx' | 'code' | 'md') => void;
  onOpenTerminal: () => void;
  onToggleSplit?: () => void;
  splitActive?: boolean;
  onRename: () => void;
  onRefresh: () => void;
  onTestConnection?: () => void;
  /** Contextual actions injected before "Trier" — vary per view (Réseau, GitHub…). */
  contextActions?: React.ReactNode;
  /** Left-aligned contextual header injected after the terminal button (e.g. GitHub back button + repo name). */
  contextHeaderLeft?: React.ReactNode;
}

export function Toolbar(props: Props) {
  const { path, viewMode, searchQuery, showPreview, canGoBack, canGoForward, canGoUp, selectedCount, hasClipboard } = props;
  const { t } = useI18n();
  const { playHover } = useSound();
  const breadcrumbRef = useRef<HTMLDivElement>(null);

  // Auto-scroll breadcrumb to end on path change
  useEffect(() => {
    const el = breadcrumbRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [path]);

  const viewModes: { mode: ViewMode; icon: React.ElementType; labelKey: string }[] = [
    { mode: 'grid-large', icon: LayoutGrid, labelKey: 'view.gridLarge' },
    { mode: 'grid-medium', icon: GripHorizontal, labelKey: 'view.gridMedium' },
    { mode: 'grid-small', icon: LayoutGrid, labelKey: 'view.gridSmall' },
    { mode: 'list', icon: LayoutList, labelKey: 'view.list' },
    { mode: 'details', icon: Table2, labelKey: 'view.details' },
    { mode: 'tiles', icon: GalleryHorizontalEnd, labelKey: 'view.tiles' },
    { mode: 'content', icon: Columns3, labelKey: 'view.content' },
  ];

  const sortFields: { field: SortField; labelKey: string }[] = [
    { field: 'name', labelKey: 'sort.name' },
    { field: 'dateModified', labelKey: 'sort.dateModified' },
    { field: 'size', labelKey: 'sort.size' },
    { field: 'type', labelKey: 'sort.type' },
  ];

  // Breadcrumb collapsing for long paths
  const renderBreadcrumb = () => {
    if (path.length <= 4) {
      return path.map((seg, i) => (
        <span key={i} className="flex items-center min-w-0 shrink-0">
          {i > 0 && <ChevronRight size={10} className="text-muted-foreground/40 mx-0.5 shrink-0" />}
          <button
            onClick={() => props.onNavigatePath(i)}
            className={cn('truncate transition-colors px-0.5 rounded-sm hover:text-primary max-w-[160px]',
              i === path.length - 1 ? 'text-foreground' : 'text-muted-foreground')}
            title={seg}
          >
            {seg}
          </button>
        </span>
      ));
    }
    // Collapse middle: first + … + last 2
    const first = path[0];
    const middle = path.slice(1, -2);
    const lastTwo = path.slice(-2);
    return (
      <>
        <span className="flex items-center shrink-0">
          <button onClick={() => props.onNavigatePath(0)} className="text-muted-foreground hover:text-primary truncate max-w-[140px] px-0.5" title={first}>
            {first}
          </button>
        </span>
        <ChevronRight size={10} className="text-muted-foreground/40 mx-0.5 shrink-0" />
        <Popover>
          <PopoverTrigger asChild>
            <button className="text-muted-foreground hover:text-primary px-1 rounded-sm hover:bg-[hsl(var(--explorer-hover))] shrink-0 flex items-center" title={middle.join(' \\ ')}>
              <MoreHorizontal size={11} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="glass-menu p-1 w-auto min-w-[180px]" align="start">
            {middle.map((seg, i) => (
              <button
                key={i}
                onClick={() => props.onNavigatePath(i + 1)}
                className="flex items-center w-full px-2 py-1 text-[12px] text-left hover:bg-[hsl(var(--explorer-hover))] rounded-sm"
              >
                <ChevronRight size={10} className="mr-1 text-muted-foreground/50" /> {seg}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        {lastTwo.map((seg, i) => {
          const realIndex = path.length - 2 + i;
          const isLast = realIndex === path.length - 1;
          return (
            <span key={realIndex} className="flex items-center min-w-0 shrink-0">
              <ChevronRight size={10} className="text-muted-foreground/40 mx-0.5 shrink-0" />
              <button
                onClick={() => props.onNavigatePath(realIndex)}
                className={cn('truncate transition-colors px-0.5 rounded-sm hover:text-primary max-w-[180px]',
                  isLast ? 'text-foreground' : 'text-muted-foreground')}
                title={seg}
              >
                {seg}
              </button>
            </span>
          );
        })}
      </>
    );
  };

  const NavBtn = ({ icon: Icon, onClick, disabled, tip }: { icon: React.ElementType; onClick: () => void; disabled?: boolean; tip: string }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={onClick} disabled={disabled}
          onMouseEnter={playHover}
          className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--explorer-hover))] disabled:opacity-20">
          <Icon size={15} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs"><p>{tip}</p></TooltipContent>
    </Tooltip>
  );

  const ActionBtn = ({ icon: Icon, onClick, disabled, tip }: { icon: React.ElementType; onClick: () => void; disabled?: boolean; tip: string }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={onClick} disabled={disabled}
          onMouseEnter={playHover}
          className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--explorer-hover))] disabled:opacity-20">
          <Icon size={14} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs"><p>{tip}</p></TooltipContent>
    </Tooltip>
  );

  return (
    <div className="flex flex-col bg-[hsl(var(--explorer-surface))] border-b border-border/40">
      <div className="flex items-center gap-1 px-2 h-9">
        <NavBtn icon={ArrowLeft} onClick={props.onGoBack} disabled={!canGoBack} tip={t('toolbar.back')} />
        <NavBtn icon={ArrowRight} onClick={props.onGoForward} disabled={!canGoForward} tip={t('toolbar.forward')} />
        <NavBtn icon={ArrowUp} onClick={props.onGoUp} disabled={!canGoUp} tip={t('toolbar.up')} />
        <NavBtn icon={RefreshCw} onClick={props.onRefresh} tip={t('toolbar.refresh')} />

        <div ref={breadcrumbRef} className="flex-1 flex items-center bg-[hsl(var(--muted))] rounded h-7 px-2 mx-1 min-w-0 text-[12px] font-light overflow-x-auto scrollbar-none whitespace-nowrap">
          {renderBreadcrumb()}
        </div>

        <div className="relative w-72 shrink-0">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            value={searchQuery}
            onChange={e => props.onSearch(e.target.value)}
            placeholder={t('toolbar.searchInFolder')}
            className="h-7 pl-7 text-[12px] font-light bg-[hsl(var(--muted))] border-transparent focus-visible:ring-1 focus-visible:ring-primary/30 rounded"
          />
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-0.5 px-2 h-8 border-t border-border/30">
        <NewMenu
          onNewFolder={props.onNewFolder}
          onNewFile={props.onNewFile}
          onOpenTerminal={props.onOpenTerminal}
          label={t('toolbar.new')}
        />
        <div className="w-px h-3.5 bg-border/30 mx-0.5" />
        <ActionBtn icon={Scissors} onClick={props.onCut} disabled={selectedCount === 0} tip={t('toolbar.cut')} />
        <ActionBtn icon={Copy} onClick={props.onCopy} disabled={selectedCount === 0} tip={t('toolbar.copy')} />
        <ActionBtn icon={Clipboard} onClick={props.onPaste} disabled={!hasClipboard} tip={t('toolbar.paste')} />
        <div className="w-px h-3.5 bg-border/30 mx-0.5" />
        <ActionBtn icon={PenLine} onClick={props.onRename} disabled={selectedCount !== 1} tip={t('toolbar.rename')} />
        <ActionBtn icon={Trash2} onClick={props.onDelete} disabled={selectedCount === 0} tip={t('toolbar.delete')} />
        <div className="w-px h-3.5 bg-border/30 mx-0.5" />
        <ActionBtn icon={TerminalSquare} onClick={props.onOpenTerminal} tip="Terminal (Ctrl+`)" />
        {props.contextHeaderLeft && (
          <>
            <div className="w-px h-3.5 bg-border/30 mx-1" />
            <div className="flex items-center min-w-0">{props.contextHeaderLeft}</div>
          </>
        )}
        {props.onToggleSplit && (
          <ActionBtn icon={Columns2} onClick={props.onToggleSplit} tip={t('toolbar.split')} />
        )}
        {props.onTestConnection && (
          <ActionBtn icon={PlugZap} onClick={props.onTestConnection} tip="Tester la connexion" />
        )}

        <div className="flex-1" />

        {props.contextActions}


        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" onMouseEnter={playHover} className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--explorer-hover))] font-light">
              <SlidersHorizontal size={12} /> {t('toolbar.sort')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-menu text-[12px]">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground section-label">{t('toolbar.sortBy')}</DropdownMenuLabel>
            {sortFields.map(({ field, labelKey }) => (
              <DropdownMenuItem key={field} onClick={() => props.onSort(field)} className={cn(props.sortField === field && 'text-primary')}>
                {t(labelKey)}
                {props.sortField === field && (props.sortDirection === 'asc' ? ' ↑' : ' ↓')}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" onMouseEnter={playHover} className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--explorer-hover))] font-light">
              <LayoutGrid size={12} /> {t('toolbar.view')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-menu text-[12px]">
            {viewModes.map(v => (
              <DropdownMenuItem key={v.mode} onClick={() => props.onViewChange(v.mode)} className={cn(viewMode === v.mode && 'text-primary')}>
                <v.icon size={13} className="mr-2" /> {t(v.labelKey)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={showPreview} onCheckedChange={props.onTogglePreview}>
              <PanelRight size={13} className="mr-2" /> {t('toolbar.previewPane')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={props.showHidden} onCheckedChange={props.onToggleHidden}>
              <Eye size={13} className="mr-2" /> {t('toolbar.showHidden')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={props.showExtensions} onCheckedChange={props.onToggleExtensions}>
              <FileText size={13} className="mr-2" /> {t('toolbar.showExtensions')}
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
