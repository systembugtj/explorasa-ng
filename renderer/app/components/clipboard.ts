import { ChangeDetectionStrategy } from '@angular/core';
import { ClipboardStateModel } from '../state/clipboard';
import { Component } from '@angular/core';
import { Input } from '@angular/core';
import { PrefsStateModel } from '../state/prefs';

/**
 * Clipboard component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elfile-clipboard',
  templateUrl: 'clipboard.html',
  styleUrls: ['clipboard.scss']
})

export class ClipboardComponent {

  @Input() clipboard = { } as ClipboardStateModel;
  @Input() prefs = { } as PrefsStateModel;

}
