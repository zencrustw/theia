/********************************************************************************
 * Copyright (C) 2018 TypeFox and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { injectable, inject } from 'inversify';
import { KeybindingContext } from '@theia/core/lib/browser';
import { ConsoleManager } from './console-manager';

export namespace ConsoleKeybindingContexts {

    /**
     * ID of a keybinding context that is enabled when the console input has the focus.
     */
    export const consoleInputFocus = 'consoleInputFocus';

}

@injectable()
export class ConsoleInputFocusContext implements KeybindingContext {

    readonly id: string = ConsoleKeybindingContexts.consoleInputFocus;

    @inject(ConsoleManager)
    protected readonly manager: ConsoleManager;

    isEnabled(): boolean {
        const console = this.manager.activeConsole;
        return !!console && console.hasInputFocus();
    }

}
