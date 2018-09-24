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

import { interfaces } from 'inversify';
import { MAIN_RPC_CONTEXT, TreeViewsMain, TreeViewsExt } from '../../../api/plugin-api';
import { RPCProtocol } from '../../../api/rpc-protocol';

export class TreeViewsMainImpl implements TreeViewsMain {

    private proxy: TreeViewsExt;

    private dataProviders: Map<string, TreeViewDataProviderMain> = new Map<string, TreeViewDataProviderMain>();

    constructor(rpc: RPCProtocol, container: interfaces.Container) {
        console.log('> TreeViewsMainImpl');
        this.proxy = rpc.getProxy(MAIN_RPC_CONTEXT.TREE_VIEWS_EXT);
    }

    $registerTreeDataProvider(treeViewId: string): void {
        console.log('MAIN: registerTreeDataProvider ', treeViewId);

        const dataProvider = new TreeViewDataProviderMain(treeViewId, this.proxy);
        this.dataProviders.set(treeViewId, dataProvider);
    }

    $refresh(treeViewId: string): void {
        console.log('MAIN: $refresh ', treeViewId);
    }

    $reveal(treeViewId: string): void {
        console.log('MAIN: $reveal ', treeViewId);
    }

}

export class TreeViewDataProviderMain {

    constructor(private treeViewId: string, private proxy: TreeViewsExt) {
        console.log('MAIN: create TreeViewDataProviderMain ', treeViewId);

        this.refreshChildren();
    }

    private async refreshChildren(): Promise<any> {
        const children = await this.proxy.$getChildren(this.treeViewId);
        console.log('MAIN: children', children);
    }

}
