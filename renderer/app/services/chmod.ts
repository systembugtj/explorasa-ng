import { FSService } from './fs';
import { Operation } from './fs';
import { OperationResult } from './fs';

/**
 * chmod
 */

export class ChmodOperation extends Operation {

  /** Make a chmod operation */
  static makeInstance(path: string,
                      mode: number,
                      fsSvc: FSService): ChmodOperation {
    const orig = fsSvc.lstat(path).mode & 0o777;
    return (mode && (mode !== orig))? new ChmodOperation(path, mode, orig) : null;
  }

  /** ctor */
  constructor(private path: string,
              private mode: number,
                      orig: number,
                      original = true) {
    super(original);
    if (original)
      this.undo = new ChmodOperation(path, orig, mode, false);
  }

  /** @override */
  runImpl(fsSvc: FSService): OperationResult {
    return fsSvc.chmod(this.path, this.mode);
  }

  /** @override */
  toStringImpl(fsSvc: FSService): string {
    return `chmod ${this.mode.toString(8)} ${this.path}`;
  }

}
