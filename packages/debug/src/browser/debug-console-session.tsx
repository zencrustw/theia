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

import { injectable, inject, postConstruct } from 'inversify';
import { Event, Emitter, MessageType } from '@theia/core/lib/common';
import { ConsoleSession, ConsoleItem } from '@theia/console/lib/browser/console-session';
import { DebugSessionManager } from './debug-session';
import * as React from 'react';
import { DebugProtocol } from 'vscode-debugprotocol/lib/debugProtocol';

@injectable()
export class DebugConsoleSession implements ConsoleSession {

    id = 'debug';
    items: ConsoleItem[] = [];
    protected readonly onDidChangeEmitter = new Emitter<void>();
    readonly onDidChange: Event<void> = this.onDidChangeEmitter.event;

    @inject(DebugSessionManager)
    protected readonly manager: DebugSessionManager;

    @postConstruct()
    init(): void {
        this.manager.onDidCreateDebugSession(session => {
            session.onDidOutput(event => this.logOutput(event));
        });
    }

    async execute(value: string): Promise<void> {
        const expression = new DebugExpression(value, this.manager);
        this.items.push(expression);
        await expression.evaluate();
        this.fireDidChange();
    }

    clear(): void {
        this.items = [];
        this.fireDidChange();
    }

    protected logOutput(event: DebugProtocol.OutputEvent): void {
        const body = event.body;
        const category = body.category;
        if (category === 'telemetry') {
            // TODO: use output view for telemetry
            return;
        }
        const severity = category === 'stderr' ? MessageType.Error : event.body.category === 'console' ? MessageType.Warning : MessageType.Info;
        if (body.variablesReference) {
            // TODO: look up variables and render them as tress
        } else if (typeof body.output === 'string') {
            this.items.push({
                severity,
                render: () => event.body.output
            });
        }
        this.fireDidChange();
    }

    protected fireDidChange(): void {
        this.onDidChangeEmitter.fire(undefined);
    }

}

export class DebugExpression implements ConsoleItem {

    static notAvailable = 'not available';

    protected value = DebugExpression.notAvailable;
    protected available = false;

    constructor(
        protected readonly expression: string,
        protected readonly manager: DebugSessionManager
    ) { }

    render(): React.ReactNode {
        const valueClassNames: string[] = [];
        if (!this.available) {
            valueClassNames.push(ConsoleItem.errorClassName);
            valueClassNames.push('theia-debug-console-unavailable');
        }
        return <React.Fragment>
            <div>{this.expression}</div>
            <div className={valueClassNames.join(' ')}>{this.value}</div>
        </React.Fragment>;
    }

    async evaluate(): Promise<void> {
        const session = this.manager.getActiveDebugSession();
        if (session) {
            try {
                const { expression } = this;
                const response = await session.evaluate({
                    expression
                });
                if (response.body.result) {
                    this.value = response.body.result;
                    this.available = true;
                }
            } catch (err) {
                this.value = err.message;
                this.available = false;
            }
        } else {
            this.value = 'Please start a debug session to evaluate';
            this.available = false;
        }
    }

}
