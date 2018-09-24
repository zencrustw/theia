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

import { MAIN_RPC_CONTEXT, NotificationExt, NotificationMain } from '../../api/plugin-api';
import { MessageService } from '@theia/core/lib/common/message-service';
import { interfaces } from 'inversify';
import { RPCProtocol } from '../../api/rpc-protocol';
import { Disposable, DisposableCollection } from '@theia/core';

export class NotificationMainImpl implements NotificationMain, Disposable {

    private readonly proxy: NotificationExt;
    private readonly messageService: MessageService;
    private readonly disposableCollection = new DisposableCollection();

    constructor(rpc: RPCProtocol, container: interfaces.Container) {
        this.proxy = rpc.getProxy(MAIN_RPC_CONTEXT.NOTIFICATION_EXT);
        this.messageService = container.get(MessageService);
    }

    $startProgress(message: string): void {
        const notification = this.messageService.getOrCreateProgressMessage(message);
        if (!notification) {
            return;
        }
        notification.show();
        this.disposableCollection.push(notification.onCancel(() => {
            this.proxy.$onCancel();
            this.dispose();
        }));
    }

    $stopProgress(message: string): void {
        const notification = this.messageService.getOrCreateProgressMessage(message);
        if (!notification) {
            return;
        }
        if (notification) {
            notification.close();
            this.disposableCollection.dispose();
        }
    }

    $updateProgress(message: string, item: { message?: string, increment?: number }): void {
        const notification = this.messageService.getOrCreateProgressMessage(message);
        if (!notification) {
            return;
        }
        if (notification) {
            notification.update(item);
        }
    }

    dispose(): void {
        this.disposableCollection.dispose();
    }
}
