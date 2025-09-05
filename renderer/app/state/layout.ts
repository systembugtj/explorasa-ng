import { Action } from '@ngxs/store';
import { Actions } from '@ngxs/store';
import { ClearSelection } from '../state/selection';
import { DirUnloaded } from './fs';
import { InitView } from './views';
import { LoadDirs } from './fs';
import { NgxsOnInit } from '@ngxs/store';
import { RemoveView } from './views';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';
import { UUID } from 'angular2-uuid';

import { config } from '../config';
import { ofAction } from '@ngxs/store';
import { timer } from 'rxjs';

/** NOTE: actions must come first because of AST */

export class AddPathToTab {
  static readonly type = '[Layout] add path to tab';
  constructor(public readonly payload: { path: string, tab: Tab }) { }
}

export class AddPathsToTab {
  static readonly type = '[Layout] add paths to tab';
  constructor(public readonly payload: { paths: string[], tab: Tab }) { }
}

export class CloseSplit {
  static readonly type = '[Layout] close split';
  constructor(public readonly payload: { splitID: string, ix: number }) { }
}

export class MakeSplit {
  static readonly type = '[Layout] make split';
  constructor(public readonly payload: { splitID: string, ix: number, direction: SplitDir, before: boolean }) { }
}

export class MoveTab {
  static readonly type = '[Layout] move tab';
  constructor(public readonly payload: { splitID: string, ix: number, tab: Tab }) { }
}

export class NewTab {
  static readonly type = '[Layout] new tab';
  constructor(public readonly payload: { splitID: string, path: string }) { }
}

export class RemovePathFromTab {
  static readonly type = '[Layout] remove path from tab';
  constructor(public readonly payload: { path: string, tab: Tab }) { }
}

export class RemoveTab {
  static readonly type = '[Layout] remove tab';
  constructor(public readonly payload: { tab: Tab }) { }
}

export class Reorient {
  static readonly type = '[Layout] reorient';
  constructor(public readonly payload: { splitID: string, direction: SplitDir } ) { }
}

export class ReplacePathsInTab {
  static readonly type = '[Layout] replace paths in tab';
  constructor(public readonly payload: { paths: string[], tab: Tab }) { }
}

export class SelectTab {
  static readonly type = '[Layout] select tab';
  constructor(public readonly payload: { tab: Tab }) { }
}

export class UpdatePathLRU {
  static readonly type = '[Layout] update path LRU';
  constructor(public readonly payload: { path: string, tab: Tab }) { }
}

export class UpdateSplitSizes {
  static readonly type = '[Layout] update split sizes';
  constructor(public readonly payload: { splitID: string, sizes: number[] }) { }
}

export class UpdateTab {
  static readonly type = '[Layout] update tab';
  constructor(public readonly payload: { tab: Tab }) { }
}

export type SplitDir = 'horizontal' | 'vertical';

export interface LRUCache {
  [path: string]: number;
 }

export interface Tab {
  color: string;
  icon: string;
  id: string;
  label: string;
  lru: LRUCache;
  paths: string[];
  selected: boolean;
}

export interface LayoutStateModel {
  direction?: SplitDir;
  id?: string;
  root?: boolean;
  size?: number;
  splits?: LayoutStateModel[];
  tabs?: Tab[];
}

@State<LayoutStateModel>({
  name: 'layout',
  defaults: LayoutState.defaultLayout()
}) export class LayoutState implements NgxsOnInit {

  /** Create the default layout */
  static defaultLayout(): LayoutStateModel {
    return {
      direction: 'vertical',
      id: UUID.UUID(),
      root: true,
      size: 100,
      splits: [ LayoutState.defaultSplit({ size: 100 }) ]
    };
  }

  /** Create default split */
  static defaultSplit(overrides: LayoutStateModel = { }): LayoutStateModel {
    return Object.assign({
      id: UUID.UUID(),
      size: 100,
      tabs: [{
        color: 'var(--mat-grey-100)',
        icon: 'fas laptop',
        id: UUID.UUID(),
        label: 'Root',
        lru: { },
        paths: ['/'],
        selected: true
      } as Tab]
    } as LayoutStateModel, overrides);
  }

  /** Deep find a layout by its ID */
  static findSplitByID(layout: LayoutStateModel,
                       splitID: string): LayoutStateModel {
    if (layout.id === splitID)
      return layout;
    if (layout.splits && layout.splits.length) {
      for (const inner of layout.splits) {
        const split = LayoutState.findSplitByID(inner, splitID);
        if (split)
          return split;
      }
    }
    return null;
  }

  /** Deep find a layout's index within its parent by its ID */
  static findSplitIndexByID(layout: LayoutStateModel,
                            splitID: string): { splitID: string, ix: number } {
    if (layout.splits && layout.splits.length) {
      for (let ix = 0; ix < layout.splits.length; ix++) {
        if (layout.splits[ix].id === splitID)
          return { splitID: layout.id, ix };
      }
      for (const inner of layout.splits) {
        const sx = LayoutState.findSplitIndexByID(inner, splitID);
        if (sx.ix !== -1)
          return { splitID: sx.splitID, ix: sx.ix };
      }
    }
    return { splitID: layout.id, ix: -1 };
  }

  /** Deep find a tab by its ID */
  static findTabIndexByID(layout: LayoutStateModel,
                          tabID: string): { split: LayoutStateModel, ix: number } {
    if (layout.tabs && layout.tabs.length) {
      const ix = layout.tabs.findIndex(tab => tab.id === tabID);
      if (ix !== -1)
        return { split: layout, ix };
    }
    if (layout.splits && layout.splits.length) {
      for (const inner of layout.splits) {
        const tx = LayoutState.findTabIndexByID(inner, tabID);
        if (tx.ix !== -1)
          return { split: inner, ix: tx.ix };
      }
    }
    return { split: layout, ix: -1 };
  }

  /** Visit each split in a layout */
  static visitSplits(layout: LayoutStateModel,
                     visitor: Function): void {
    if (layout.splits && layout.splits.length) {
      for (const inner of layout.splits) {
        visitor(inner);
        LayoutState.visitSplits(inner, visitor);
      }
    }
  }

  /** Visit each tab in a layout */
  static visitTabs(layout: LayoutStateModel,
                   visitor: Function): void {
    if (layout.tabs && layout.tabs.length) {
      for (const tab of layout.tabs)
        visitor(tab);
    }
    if (layout.splits && layout.splits.length) {
      for (const inner of layout.splits)
        LayoutState.visitTabs(inner, visitor);
    }
  }

  /** ctor */
  constructor(private actions$: Actions) { }

  @Action(AddPathToTab)
  addPathToTab({ dispatch, getState, setState }: StateContext<LayoutStateModel>,
               { payload }: AddPathToTab) {
    const { path, tab } = payload;
    if (!tab.paths.includes(path)) {
      const paths = tab.paths.slice(0);
      paths.push(path);
      const state = getState();
      const tx = LayoutState.findTabIndexByID(state, tab.id);
      if (tx.ix !== -1) {
        tx.split.tabs = tx.split.tabs.slice(0);
        tx.split.tabs[tx.ix] = { ...tab, paths };
        setState({ ...state });
        dispatch(new LoadDirs({ paths: [path] }));
      }
    }
  }

  @Action(AddPathsToTab)
  addPathsToTab({ dispatch, getState, setState }: StateContext<LayoutStateModel>,
               { payload }: AddPathsToTab) {
    const { paths, tab } = payload;
    // NOTE: this mess keeps the root path and makes the rest unique
    const updated = [tab.paths[0], ...Array.from(new Set(paths.concat(tab.paths.slice(1))))];
    const state = getState();
    const tx = LayoutState.findTabIndexByID(state, tab.id);
    if (tx.ix !== -1) {
      tx.split.tabs = tx.split.tabs.slice(0);
      tx.split.tabs[tx.ix] = { ...tab, paths: updated };
      setState({ ...state });
      dispatch(new LoadDirs({ paths: updated }));
    }
  }

  @Action(CloseSplit)
  closeSplit({ dispatch, getState, setState }: StateContext<LayoutStateModel>,
             { payload }: CloseSplit) {
    const { splitID, ix } = payload;
    const state = getState();
    const split = LayoutState.findSplitByID(state, splitID);
    if (split) {
      // remove any views first
      const splat = split.splits[ix];
      LayoutState.visitTabs(splat, (tab: Tab) => {
        dispatch(new RemoveView({ viewID: tab.id }));
      });
      split.splits.splice(ix, 1);
      // if we have more than one split left (or at the root level)
      // we set everyone to the same size, distributed evenly
      if (split.root || (split.splits.length > 1)) {
        const size = 100 / split.splits.length;
        split.splits.forEach(split => split.size = size);
      }
      // but if only one split left, collapse the splits
      // NOTE: the root level can't be deleted
      else {
        split.id = split.splits[0].id;
        split.tabs = split.splits[0].tabs;
        delete split.direction;
        delete split.splits;
        delete split.tabs;
      }
      setState({ ...state });
    }
  }

  @Action(MakeSplit)
  makeSplit({ dispatch, getState, setState }: StateContext<LayoutStateModel>,
            { payload }: MakeSplit) {
    const { splitID, ix, direction, before } = payload;
    const state = getState();
    const split = LayoutState.findSplitByID(state, splitID);
    if (split) {
      // making a split on the same axis is easy
      // we set everyone to the same size, distributed evenly
      const newSplit = LayoutState.defaultSplit({ size: 50 });
      if (split.direction === direction) {
        const iy = ix + (before? 0 : 1);
        split.splits.splice(iy, 0, newSplit);
        const size = 100 / split.splits.length;
        split.splits.forEach(split => split.size = size);
      }
      // but now we want to split in the opposite direction
      // we create a new sub-split, preserving IDs
      // we also set everyone to the same size, distributed evenly
      else {
        const splat = split.splits[ix];
        splat.direction = direction;
        const splatID = splat.id;
        const splatTabs = splat.tabs;
        splat.id = UUID.UUID();
        delete splat.tabs;
        if (before)
          splat.splits = [newSplit, { id: splatID, size: 50, tabs: splatTabs }];
        else splat.splits = [{ id: splatID, size: 50, tabs: splatTabs }, newSplit];
      }
      setState({ ...state });
      // initialize any new tab preferences
      // load paths, making them unique
      const paths = { };
      newSplit.tabs.forEach((tab: Tab) => {
        dispatch(new InitView({ viewID: tab.id }));
        tab.paths.forEach(path => paths[path] = true);
      });
      dispatch(new LoadDirs({ paths: Object.keys(paths) }));
    }
  }

  @Action(MoveTab)
  moveTab({ dispatch, getState, setState }: StateContext<LayoutStateModel>,
          { payload }: MoveTab) {
    const { splitID, ix, tab } = payload;
    const state = getState();
    const split = LayoutState.findSplitByID(state, splitID);
    if (split) {
      // NOTE: "split" is the target split
      const tx = LayoutState.findTabIndexByID(state, tab.id);
      if (tx.ix !== -1) {
        // NOTE "tx" references the source
        tx.split.tabs = tx.split.tabs.slice(0);
        tx.split.tabs.splice(tx.ix, 1);
        // NOTE: we can only be left with zero tabs if we moved a tab from
        // another split
        if (tx.split.tabs.length === 0) {
          const sx = LayoutState.findSplitIndexByID(state, tx.split.id);
          if (sx.ix !== -1)
            dispatch(new CloseSplit({ splitID: sx.splitID, ix: sx.ix }));
        }
        split.tabs = split.tabs.slice(0);
        split.tabs.splice(ix, 0, tab);
        setState({ ...state });
      }
    }
  }

  @Action(NewTab)
  newTab({ dispatch, getState, setState }: StateContext<LayoutStateModel>,
         { payload }: NewTab) {
    const { splitID, path } = payload;
    const state = getState();
    const split = LayoutState.findSplitByID(state, splitID);
    if (split && split.tabs) {
      const tab = {
        color: 'var(--mat-grey-100)',
        icon: 'fab linux',
        id: UUID.UUID(),
        label: this.makeLabelFromPath(path),
        lru: { },
        paths: [path],
        selected: false
      };
      split.tabs.push(tab);
      setState({ ...state });
      dispatch(new InitView({ viewID: tab.id }));
      dispatch(new LoadDirs({ paths: [path] }));
      dispatch(new SelectTab({ tab }));
    }
  }

  @Action(RemovePathFromTab)
  removePathFromTab({ dispatch, getState, setState }: StateContext<LayoutStateModel>,
                    { payload }: RemovePathFromTab) {
    const { path, tab } = payload;
    if (tab.paths.includes(path)) {
      const { [path]: removed, ...lru } = tab.lru || { };
      const paths = tab.paths.slice(0);
      const ix = paths.indexOf(path);
      paths.splice(ix, 1);
      const state = getState();
      const tx = LayoutState.findTabIndexByID(state, tab.id);
      if (tx.ix !== -1) {
        tx.split.tabs = tx.split.tabs.slice(0);
        tx.split.tabs[tx.ix] = { ...tab, lru, paths };
        setState({ ...state });
      }
    }
  }

  @Action(RemoveTab)
  removeTab({ dispatch, getState, setState }: StateContext<LayoutStateModel>,
            { payload }: RemoveTab) {
    const { tab } = payload;
    const state = getState();
    const tx = LayoutState.findTabIndexByID(state, tab.id);
    if ((tx.split.tabs.length > 1) && (tx.ix !== -1)) {
      const tab = tx.split.tabs[tx.ix];
      tx.split.tabs = tx.split.tabs.slice(0);
      tx.split.tabs.splice(tx.ix, 1);
      setState({ ...state });
      dispatch(new RemoveView({ viewID: tab.id }));
      if (tab.selected)
        dispatch(new SelectTab({ tab: tx.split.tabs[0] }));
    }
  }

  @Action(Reorient)
  reorient({ getState, setState }: StateContext<LayoutStateModel>,
           { payload }: Reorient) {
    const { splitID, direction } = payload;
    const state = getState();
    const split = LayoutState.findSplitByID(state, splitID);
    if (split) {
      split.direction = direction;
      setState({ ...state });
    }
  }

  @Action(ReplacePathsInTab)
  replacePathsInTab({ dispatch, getState, setState }: StateContext<LayoutStateModel>,
                    { payload }: ReplacePathsInTab) {
    const { paths, tab } = payload;
    const state = getState();
    const tx = LayoutState.findTabIndexByID(state, tab.id);
    if (tx.ix !== -1) {
      tx.split.tabs = tx.split.tabs.slice(0);
      tx.split.tabs[tx.ix] = { ...tab, lru: { }, paths };
      setState({ ...state });
      dispatch(new LoadDirs({ paths: paths }));
    }
  }

  @Action(SelectTab)
  selectTab({ dispatch, getState, setState }: StateContext<LayoutStateModel>,
            { payload }: SelectTab) {
    const { tab } = payload;
    const state = getState();
    const tx = LayoutState.findTabIndexByID(state, tab.id);
    if (tx.ix !== -1) {
      tx.split.tabs = tx.split.tabs.map((tab, iy) => ({ ...tab, selected: (tx.ix === iy) }));
      setState({ ...state });
      dispatch(new ClearSelection());
    }
  }

  @Action(UpdatePathLRU)
  updatePathLRU({ dispatch, getState, setState }: StateContext<LayoutStateModel>,
                { payload }: UpdatePathLRU) {
    const { path, tab } = payload;
    const lru = { ...tab.lru, [path]: Date.now() };
    const state = getState();
    const tx = LayoutState.findTabIndexByID(state, tab.id);
    if (tx.ix !== -1) {
      // NOTE: no need to trigger change here
      // tx.split.tabs = tx.split.tabs.slice(0);
      tx.split.tabs[tx.ix] = { ...tab, lru };
      setState({ ...state });
    }
  }

  @Action(UpdateSplitSizes)
  updateSplitSizes({ getState, setState }: StateContext<LayoutStateModel>,
                   { payload }: UpdateSplitSizes) {
    const { splitID, sizes } = payload;
    const state = getState();
    const split = LayoutState.findSplitByID(state, splitID);
    if (split) {
      sizes.forEach((size, ix) => split.splits[ix].size = size);
      setState({ ...state });
    }
  }

  @Action(UpdateTab)
  updateTab({ dispatch, getState, setState }: StateContext<LayoutStateModel>,
            { payload }: UpdateTab) {
    const { tab } = payload;
    const state = getState();
    const tx = LayoutState.findTabIndexByID(state, tab.id);
    if (tx.ix !== -1) {
      tx.split.tabs = tx.split.tabs.slice(0);
      tx.split.tabs[tx.ix] = { ...tab };
      setState({ ...state });
      dispatch(new LoadDirs({ paths: tab.paths }));
    }
  }

  // lifecycle methods

  ngxsOnInit(ctx: StateContext<LayoutStateModel>) {
    this.handleDirUnloaded(ctx);
    this.handleLRUPurge(ctx);
    this.loadInitialPaths(ctx);
    this.initViews(ctx);
  }

  // private methods

  private handleDirUnloaded({ dispatch, getState }: StateContext<LayoutStateModel>): void {
    this.actions$
      .pipe(ofAction(DirUnloaded))
      .subscribe(({ path }) => {
        const layout = getState();
        LayoutState.visitTabs(layout, (tab: Tab) => {
          const ix = tab.paths.indexOf(path);
          if (ix !== -1)
            dispatch(new RemovePathFromTab({ path, tab }));
        });
      });
  }

  private handleLRUPurge({ dispatch, getState }: StateContext<LayoutStateModel>): void {
    timer(config.dirPurgeInterval, config.dirPurgeInterval)
      .subscribe(() => {
        const layout = getState();
        LayoutState.visitTabs(layout, (tab: Tab) => {
          // NOTE: don't purge anything in a selected tab, nor the root path
          if (!tab.selected) {
            tab.paths.forEach((path, ix) => {
              if (ix > 0) {
                const lru = tab.lru[path];
                if (lru < (Date.now() - config.dirPurgeAge))
                  dispatch(new RemovePathFromTab({ path, tab }));
              }
            });
          }
        });
      });
  }

  private initViews({ dispatch, getState }: StateContext<LayoutStateModel>): void {
    const layout = getState();
    LayoutState.visitTabs(layout, (tab: Tab) => {
      dispatch(new InitView({ viewID: tab.id }));
    });
  }

  private loadInitialPaths({ dispatch, getState }: StateContext<LayoutStateModel>): void {
    const layout = getState();
    const paths = { };
    // make sure we only load a path once
    LayoutState.visitTabs(layout, (tab: Tab) => {
      tab.paths.forEach(path => paths[path] = true);
    });
    dispatch(new LoadDirs({ paths: Object.keys(paths) }));
  }

  private makeLabelFromPath(path: string): string {
    let label;
    if (path.endsWith('/'))
      label = path.substring(0, path.length - 1);
    else label = path;
    if (label.length === 0)
      label = 'Root';
    else {
      const ix = label.lastIndexOf('/');
      if (ix !== -1)
        label = label.substring(ix + 1);
    }
    return label;
  }

}
