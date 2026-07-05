import { useState, useCallback, useMemo } from 'react';
import { NavigationState, ClipboardState, SortField, SortDirection, ViewMode, ExplorerLocation } from '@/types/fileExplorer';
import { fileSystem, getAncestors } from '@/data/mockFileSystem';

function locationToFolderId(loc: ExplorerLocation): string {
  if (loc.type === 'directory') return loc.folderId;
  if (loc.type === 'virtual') {
    switch (loc.id) {
      case 'this-pc': return 'root';
      case 'network': return 'network-root';
      case 'trash': return 'recycle-bin';
      case 'quick-access': return 'root';
    }
  }
  return 'root';
}

function buildPath(folderId: string): string[] {
  const path: string[] = [];
  let current = fileSystem[folderId];
  while (current) {
    path.unshift(current.name);
    current = current.parentId ? fileSystem[current.parentId] : null as any;
  }
  return path;
}

export function useFileExplorer(initialFolderId?: string) {
  // 'root' is the virtual "This PC" landing — start in DriveOverview, not flat root listing
  const startVirtual = !initialFolderId || initialFolderId === 'root' || !fileSystem[initialFolderId];
  const initialLocation: ExplorerLocation = startVirtual
    ? { type: 'virtual', id: 'this-pc' }
    : { type: 'directory', folderId: initialFolderId };
  const initialFolder = startVirtual ? 'root' : initialFolderId;

  const [nav, setNav] = useState<NavigationState>({
    location: initialLocation,
    currentPath: buildPath(initialFolder),
    currentFolderId: initialFolder,
    history: [initialLocation],
    historyIndex: 0,
    selectedItems: [],
    selectionAnchor: null,
    viewMode: 'grid-medium',
    sortField: 'name',
    sortDirection: 'asc',
    searchQuery: '',
    showPreview: false,
    iconSize: 80,
    expandedNodes: new Set<string>(),
    renamingId: null,
  });

  const [clipboard, setClipboard] = useState<ClipboardState>({ items: [], operation: null });
  const [deletedItems, setDeletedItems] = useState<string[]>([]);
  const [renamedItems, setRenamedItems] = useState<Record<string, string>>({});
  const [pastedItems, setPastedItems] = useState<Record<string, string>>({}); // id → parentId
  const [showHidden, setShowHidden] = useState(false);
  const [showExtensions, setShowExtensions] = useState(true);

  const currentFolder = fileSystem[nav.currentFolderId];

  const currentChildren = useMemo(() => {
    if (nav.location.type === 'search') {
      const q = nav.location.query.toLowerCase();
      const results: any[] = [];
      const searchIn = nav.location.baseFolderId || nav.currentFolderId;
      const folder = fileSystem[searchIn];
      if (folder?.children) {
        const search = (ids: string[]) => {
          for (const id of ids) {
            const f = fileSystem[id];
            if (!f || deletedItems.includes(f.id)) continue;
            if (!showHidden && f.isHidden) continue;
            const name = renamedItems[f.id] || f.name;
            if (name.toLowerCase().includes(q)) results.push(f);
            if (f.type === 'folder' && f.children) search(f.children);
          }
        };
        search(folder.children);
      }
      return results;
    }

    // base children + pasted-into-this-folder
    const baseChildren = currentFolder?.children
      ?.map(id => fileSystem[id])
      .filter(f => f && (showHidden || !f.isHidden) && !deletedItems.includes(f.id)) || [];

    const pasted = Object.entries(pastedItems)
      .filter(([, parent]) => parent === nav.currentFolderId)
      .map(([id]) => fileSystem[id])
      .filter(Boolean);

    let children = [...baseChildren, ...pasted.filter(p => !baseChildren.find(b => b.id === p.id))];

    if (nav.searchQuery) {
      const q = nav.searchQuery.toLowerCase();
      children = children.filter(f => {
        const name = renamedItems[f.id] || f.name;
        return name.toLowerCase().includes(q);
      });
    }

    children.sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      let cmp = 0;
      const nameA = renamedItems[a.id] || a.name;
      const nameB = renamedItems[b.id] || b.name;
      switch (nav.sortField) {
        case 'name': cmp = nameA.localeCompare(nameB); break;
        case 'size': cmp = (a.size || 0) - (b.size || 0); break;
        case 'type': cmp = a.type.localeCompare(b.type); break;
        case 'dateModified': cmp = a.dateModified.getTime() - b.dateModified.getTime(); break;
        case 'dateCreated': cmp = a.dateCreated.getTime() - b.dateCreated.getTime(); break;
      }
      return nav.sortDirection === 'asc' ? cmp : -cmp;
    });

    return children;
  }, [nav.currentFolderId, nav.location, nav.sortField, nav.sortDirection, nav.searchQuery, deletedItems, renamedItems, pastedItems, showHidden, currentFolder]);

  const navigateTo = useCallback((folderId: string) => {
    const loc: ExplorerLocation = { type: 'directory', folderId };
    const path = buildPath(folderId);
    const ancestors = getAncestors(folderId);
    setNav(prev => {
      const newHistory = [...prev.history.slice(0, prev.historyIndex + 1), loc];
      const expanded = new Set(prev.expandedNodes);
      ancestors.forEach(a => expanded.add(a));
      expanded.add(folderId);
      return {
        ...prev,
        location: loc, currentFolderId: folderId, currentPath: path,
        history: newHistory, historyIndex: newHistory.length - 1,
        selectedItems: [], selectionAnchor: null, searchQuery: '',
        expandedNodes: expanded, renamingId: null,
      };
    });
  }, []);

  const navigateToLocation = useCallback((loc: ExplorerLocation) => {
    const folderId = locationToFolderId(loc);
    const path = buildPath(folderId);
    setNav(prev => {
      const newHistory = [...prev.history.slice(0, prev.historyIndex + 1), loc];
      return {
        ...prev,
        location: loc, currentFolderId: folderId, currentPath: path,
        history: newHistory, historyIndex: newHistory.length - 1,
        selectedItems: [], selectionAnchor: null, searchQuery: '', renamingId: null,
      };
    });
  }, []);

  const goBack = useCallback(() => {
    setNav(prev => {
      if (prev.historyIndex <= 0) return prev;
      const newIndex = prev.historyIndex - 1;
      const loc = prev.history[newIndex];
      const folderId = locationToFolderId(loc);
      return { ...prev, location: loc, currentFolderId: folderId, currentPath: buildPath(folderId), historyIndex: newIndex, selectedItems: [], selectionAnchor: null, renamingId: null };
    });
  }, []);

  const goForward = useCallback(() => {
    setNav(prev => {
      if (prev.historyIndex >= prev.history.length - 1) return prev;
      const newIndex = prev.historyIndex + 1;
      const loc = prev.history[newIndex];
      const folderId = locationToFolderId(loc);
      return { ...prev, location: loc, currentFolderId: folderId, currentPath: buildPath(folderId), historyIndex: newIndex, selectedItems: [], selectionAnchor: null, renamingId: null };
    });
  }, []);

  const goUp = useCallback(() => {
    if (currentFolder?.parentId) navigateTo(currentFolder.parentId);
  }, [currentFolder, navigateTo]);

  const selectItem = useCallback((id: string, mode: 'single' | 'ctrl' | 'shift' = 'single') => {
    setNav(prev => {
      if (mode === 'ctrl') {
        const items = prev.selectedItems.includes(id)
          ? prev.selectedItems.filter(i => i !== id)
          : [...prev.selectedItems, id];
        return { ...prev, selectedItems: items, selectionAnchor: id };
      }
      if (mode === 'shift' && prev.selectionAnchor) {
        const allIds = currentChildren.map(f => f.id);
        const anchorIdx = allIds.indexOf(prev.selectionAnchor);
        const currentIdx = allIds.indexOf(id);
        if (anchorIdx !== -1 && currentIdx !== -1) {
          const start = Math.min(anchorIdx, currentIdx);
          const end = Math.max(anchorIdx, currentIdx);
          const range = allIds.slice(start, end + 1);
          return { ...prev, selectedItems: range };
        }
      }
      return { ...prev, selectedItems: [id], selectionAnchor: id };
    });
  }, [currentChildren]);

  const clearSelection = useCallback(() => {
    setNav(prev => ({ ...prev, selectedItems: [], selectionAnchor: null }));
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => setNav(prev => ({ ...prev, viewMode: mode })), []);
  const setSort = useCallback((field: SortField) => setNav(prev => ({
    ...prev, sortField: field,
    sortDirection: prev.sortField === field && prev.sortDirection === 'asc' ? 'desc' : 'asc',
  })), []);
  const setSearchQuery = useCallback((query: string) => setNav(prev => ({ ...prev, searchQuery: query })), []);
  const togglePreview = useCallback(() => setNav(prev => ({ ...prev, showPreview: !prev.showPreview })), []);
  const openPreview = useCallback(() => setNav(prev => ({ ...prev, showPreview: true })), []);
  const setIconSize = useCallback((size: number) => setNav(prev => ({ ...prev, iconSize: size })), []);
  const toggleExpanded = useCallback((id: string) => {
    setNav(prev => {
      const expanded = new Set(prev.expandedNodes);
      if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
      return { ...prev, expandedNodes: expanded };
    });
  }, []);

  const copyItems = useCallback((ids: string[]) => setClipboard({ items: ids, operation: 'copy' }), []);
  const cutItems = useCallback((ids: string[]) => setClipboard({ items: ids, operation: 'cut' }), []);

  const pasteItems = useCallback((targetFolderId?: string) => {
    if (clipboard.items.length === 0 || clipboard.operation === null) return 0;
    const target = targetFolderId || nav.currentFolderId;
    let count = 0;
    setPastedItems(prev => {
      const next = { ...prev };
      clipboard.items.forEach(id => {
        if (clipboard.operation === 'copy') {
          // duplicate as new id
          const original = fileSystem[id];
          if (!original) return;
          const newId = `paste-${id}-${Date.now()}-${count}`;
          (fileSystem as any)[newId] = {
            ...original,
            id: newId,
            name: `${original.name}`,
            parentId: target,
            dateModified: new Date(),
            dateCreated: new Date(),
          };
          next[newId] = target;
          count++;
        } else if (clipboard.operation === 'cut') {
          // move: just reparent visually
          next[id] = target;
          count++;
        }
      });
      return next;
    });
    if (clipboard.operation === 'cut') setClipboard({ items: [], operation: null });
    return count;
  }, [clipboard, nav.currentFolderId]);

  const deleteItems = useCallback((ids: string[]) => {
    setDeletedItems(prev => [...prev, ...ids]);
    setNav(prev => ({ ...prev, selectedItems: [], selectionAnchor: null }));
  }, []);

  const startRename = useCallback((id: string) => {
    setNav(prev => ({ ...prev, renamingId: id, selectedItems: [id] }));
  }, []);
  const confirmRename = useCallback((id: string, newName: string) => {
    if (newName.trim()) setRenamedItems(prev => ({ ...prev, [id]: newName.trim() }));
    setNav(prev => ({ ...prev, renamingId: null }));
  }, []);
  const cancelRename = useCallback(() => setNav(prev => ({ ...prev, renamingId: null })), []);

  const createFolder = useCallback(() => {
    const id = `new-folder-${Date.now()}`;
    const newFolder = {
      id, name: 'Nouveau dossier', type: 'folder' as const,
      dateModified: new Date(), dateCreated: new Date(),
      parentId: nav.currentFolderId, children: [],
    };
    (fileSystem as any)[id] = newFolder;
    if (currentFolder?.children) currentFolder.children.push(id);
    setNav(prev => ({ ...prev, selectedItems: [id], renamingId: id, selectionAnchor: id }));
  }, [nav.currentFolderId, currentFolder]);

  const getItemName = useCallback((id: string) => renamedItems[id] || fileSystem[id]?.name || '', [renamedItems]);

  const buildFullPath = useCallback((id: string): string => {
    const parts: string[] = [];
    let current = fileSystem[id];
    while (current) {
      parts.unshift(getItemName(current.id));
      current = current.parentId ? fileSystem[current.parentId] : null as any;
    }
    return parts.join(' \\ ');
  }, [getItemName]);

  const canGoBack = nav.historyIndex > 0;
  const canGoForward = nav.historyIndex < nav.history.length - 1;
  const canGoUp = !!currentFolder?.parentId;
  const isVirtualView = nav.location.type === 'virtual';

  return {
    nav, currentFolder, currentChildren,
    navigateTo, navigateToLocation, goBack, goForward, goUp,
    selectItem, clearSelection,
    setViewMode, setSort, setSearchQuery,
    togglePreview, openPreview, setIconSize, toggleExpanded,
    clipboard, copyItems, cutItems, pasteItems, deleteItems,
    startRename, confirmRename, cancelRename, getItemName, buildFullPath,
    createFolder,
    canGoBack, canGoForward, canGoUp, isVirtualView,
    renamedItems,
    showHidden, setShowHidden, showExtensions, setShowExtensions,
  };
}
