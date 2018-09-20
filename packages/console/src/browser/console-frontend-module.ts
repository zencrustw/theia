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

import { ContainerModule } from 'inversify';
import { CommandContribution } from '@theia/core';
import { FrontendApplicationContribution, WidgetFactory, KeybindingContext, KeybindingContribution } from '@theia/core/lib/browser';
import { ConsoleContribution } from './console-contribution';
import { ConsoleWidget, ConsoleOptions } from './console-widget';
import { ConsoleManager } from './console-manager';
import { ConsoleInputFocusContext } from './console-keybinding-contexts';

import '../../src/browser/style/index.css';

export default new ContainerModule(bind => {
    bind(ConsoleWidget).toSelf();
    bind(ConsoleManager).toSelf().inSingletonScope();
    bind(WidgetFactory).toDynamicValue(({ container }) => ({
        id: ConsoleManager.ID,
        createWidget: (options: ConsoleOptions) => {
            const child = container.createChild();
            child.bind(ConsoleOptions).toConstantValue(options);
            return child.get(ConsoleWidget);
        }
    })).inSingletonScope();

    bind(KeybindingContext).to(ConsoleInputFocusContext).inSingletonScope();
    bind(ConsoleContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(ConsoleContribution);
    bind(CommandContribution).toService(ConsoleContribution);
    bind(KeybindingContribution).toService(ConsoleContribution);
});
