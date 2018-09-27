/********************************************************************************
 * Copyright (C) 2018 Red Hat, Inc. and others.
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
import { DebugProtocol } from 'vscode-debugprotocol';
import { BreakpointStorage } from './breakpoint-marker';
import { DebugUtils } from '../debug-utils';
import { DebugSession } from '../debug-model';

/**
 * Applies session breakpoints.
 */
@injectable()
export class BreakpointsApplier {
    constructor(@inject(BreakpointStorage) protected readonly storage: BreakpointStorage) { }

    async applySessionBreakpoints(debugSession: DebugSession, source?: DebugProtocol.Source): Promise<void> {
        const breakpoints = this.storage.get(DebugUtils.isSourceBreakpoint)
            .filter(b => b.sessionId === debugSession.sessionId)
            .filter(b => source ? DebugUtils.checkUri(b, DebugUtils.toUri(source)) : true);

        for (const breakpointsBySource of DebugUtils.groupBySource(breakpoints).values()) {
            const args: DebugProtocol.SetBreakpointsArguments = {
                source: breakpointsBySource[0].source!,
                breakpoints: breakpointsBySource.map(b => b.origin as DebugProtocol.SourceBreakpoint),
                // Although marked as deprecated, some debug adapters still use lines
                lines: breakpointsBySource.map(b => (b.origin as DebugProtocol.SourceBreakpoint).line)
            };

            // The array elements are in the same order as the elements
            // of the 'breakpoints' in the SetBreakpointsArguments.
            const response = await debugSession.setBreakpoints(args);
            for (const i in breakpointsBySource) {
                if (breakpointsBySource) {
                    if (response.body.breakpoints) {
                        breakpointsBySource[i].created = response.body.breakpoints[i];
                    }
                }
            }

            this.storage.update(breakpointsBySource);
        }
    }
}
