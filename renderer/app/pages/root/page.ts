import { Alarm } from '../../state/status';
import { ClipboardState } from '../../state/clipboard';
import { Component } from '@angular/core';
import { CopyOperation } from '../../services/copy';
import { CopyToClipboard } from '../../state/clipboard';
import { CutToClipboard } from '../../state/clipboard';
import { Descriptor } from '../../state/fs';
import { DrawerPanelComponent } from 'ellib';
import { FSService } from '../../services/fs';
import { MoveOperation } from '../../services/move';
import { SelectionState } from '../../state/selection';
import { SplittableComponent } from '../../components/splittable';
import { StatusState } from '../../state/status';
import { Store } from '@ngxs/store';
import { Tab } from '../../state/layout';
import { View } from '../../state/views';
import { ViewChild } from '@angular/core';

/**
 * EL-file Root
 */

@Component({
  selector: 'elfile-root',
  templateUrl: 'page.html',
  styleUrls: ['page.scss']
})

export class RootPageComponent {

  @ViewChild(SplittableComponent, { static: true }) splittable: SplittableComponent;

  @ViewChild('propsDrawer', { static: true }) propsDrawer: DrawerPanelComponent;
  @ViewChild('tabDrawer', { static: true }) tabDrawer: DrawerPanelComponent;
  @ViewChild('viewDrawer', { static: true }) viewDrawer: DrawerPanelComponent;

  editDesc = { } as Descriptor;

  editTab = { } as Tab;
  noRemoveTab: boolean;

  editView = { } as View;
  editViewID: string;

  /** ctor */
  constructor(private fsSvc: FSService,
              private store: Store) { }

  // event handlers

  onEditProps(desc: Descriptor): void {
    this.editDesc = desc;
    this.propsDrawer.open();
  }

  onEditTab(tab: Tab): void {
    this.editTab = tab;
    this.tabDrawer.open();
  }

  onEditView(view: View,
             viewID: string): void {
    this.editView = view;
    this.editViewID = viewID;
    this.viewDrawer.open();
  }

  onKeystroke(event: KeyboardEvent): void {
    if (event.ctrlKey) {
      let alarm = false;
      switch (event.key) {

        case 'c':
        case 'v':
        case 'x':
          const clip = this.store.selectSnapshot(ClipboardState.getPaths);
          const clipOp = this.store.selectSnapshot(ClipboardState.getOp);
          const isOpRunning = this.store.selectSnapshot(StatusState.isOpRunning);
          const paths = this.store.selectSnapshot(SelectionState.getPaths);
          if (paths.length > 0) {
            if (event.key === 'c')
              this.store.dispatch(new CopyToClipboard({ paths }));
            else if (event.key === 'v') {
              if (!isOpRunning && (clip.length > 0) && (paths.length === 1)) {
                const pasteOp = (clipOp === 'copy')?
                  CopyOperation.makeInstance(clip, paths[0], this.fsSvc) :
                  MoveOperation.makeInstance(clip, paths[0], this.fsSvc);
                if (pasteOp) 
                  this.fsSvc.run(pasteOp);
                else alarm = true;
              }
              else alarm = true;
            }
            else if (event.key === 'x')
              this.store.dispatch(new CutToClipboard({ paths }));
          }
          else alarm = true;
          break;

        case 'z':
          if (this.fsSvc.canUndo())
            this.fsSvc.undo();
          else alarm = true;
          break;

        case 'y':
          if (this.fsSvc.canRedo())
            this.fsSvc.redo();
          else alarm = true;
          break;

      }
      if (alarm)
        this.store.dispatch(new Alarm({ alarm: true }));
    }
  }

}
