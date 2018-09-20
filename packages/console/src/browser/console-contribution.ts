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
import { FrontendApplicationContribution, KeybindingContribution, KeybindingRegistry } from '@theia/core/lib/browser';
import { ConsoleManager } from './console-manager';
import { CommandContribution, CommandRegistry } from '@theia/core/lib/common';
import { Command } from '@theia/core';
import { ConsoleKeybindingContexts } from './console-keybinding-contexts';

export namespace ConsoleCommands {
    export const EXECUTE: Command = {
        id: 'console.execute'
    };
}

@injectable()
export class ConsoleContribution implements FrontendApplicationContribution, CommandContribution, KeybindingContribution {

    @inject(ConsoleManager)
    protected readonly manager: ConsoleManager;

    initialize(): void { }

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(ConsoleCommands.EXECUTE, {
            isEnabled: () => !!this.manager.activeConsole,
            isVisible: () => !!this.manager.activeConsole,
            execute: () => this.execute()
        });
    }

    registerKeybindings(keybindings: KeybindingRegistry): void {
        keybindings.registerKeybinding({
            command: ConsoleCommands.EXECUTE.id,
            keybinding: 'enter',
            context: ConsoleKeybindingContexts.consoleInputFocus
        });
    }

    execute(): void {
        const { activeConsole } = this.manager;
        if (activeConsole) {
            activeConsole.execute();
        }
    }

}
