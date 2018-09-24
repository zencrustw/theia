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

import { TreeDataProvider, TreeView, TreeViewExpansionEvent } from '@theia/plugin';
import { Emitter } from '@theia/core/lib/common/event';
import { Disposable } from '../types-impl';
import { PLUGIN_RPC_CONTEXT, TreeViewsExt, TreeViewsMain, TreeViewItem } from '../../api/plugin-api';
import { RPCProtocol } from '../../api/rpc-protocol';

export class TreeViewsExtImpl implements TreeViewsExt {

    private proxy: TreeViewsMain;

    private treeViews: Map<string, TreeViewExtImpl<any>> = new Map<string, TreeViewExtImpl<any>>();

    constructor(rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.TREE_VIEWS_MAIN);
    }

    registerTreeDataProvider<T>(viewId: string, treeDataProvider: TreeDataProvider<T>): Disposable {
        const treeView = this.createTreeView(viewId, { treeDataProvider });

        return Disposable.create(() => {
            this.treeViews.delete(viewId);
            treeView.dispose();
        });
    }

    createTreeView<T>(viewId: string, options: { treeDataProvider: TreeDataProvider<T> }): TreeView<T> {
        if (!options || !options.treeDataProvider) {
            throw new Error('Options with treeDataProvider is mandatory');
        }

        const treeView = new TreeViewExtImpl(viewId, options.treeDataProvider, this.proxy);
        this.treeViews.set(viewId, treeView);

        return {
            get onDidExpandElement() {
                return treeView.onDidExpandElement;
            },

            get onDidCollapseElement() {
                return treeView.onDidCollapseElement;
            },

            get selection() {
                return treeView.selectedElements;
            },

            reveal: (element: T, _options: { select?: boolean }): Thenable<void> => treeView.reveal(element, _options),

            dispose: () => {
                this.treeViews.delete(viewId);
                treeView.dispose();
            }
        };

    }

    async $getChildren(treeViewId: string): Promise<TreeViewItem[] | undefined> {
        console.log('PLUGIN: $getChildren', treeViewId);

        const treeView = this.treeViews.get(treeViewId);
        if (!treeView) {
            throw new Error('No tree view with id' + treeViewId);
        }

        return treeView.getChildren();
    }

    async $setExpanded(treeViewId: string): Promise<any> {
        console.log('PLUGIN: $setExpanded', treeViewId);
    }

    async $setSelection(treeViewId: string): Promise<any> {
        console.log('PLUGIN: $setSelection', treeViewId);
    }

}

class TreeViewExtImpl<T> extends Disposable {

    private onDidExpandElementEmmiter: Emitter<TreeViewExpansionEvent<T>> = new Emitter<TreeViewExpansionEvent<T>>();
    public readonly onDidExpandElement = this.onDidExpandElementEmmiter.event;

    private onDidCollapseElementEmmiter: Emitter<TreeViewExpansionEvent<T>> = new Emitter<TreeViewExpansionEvent<T>>();
    public readonly onDidCollapseElement = this.onDidCollapseElementEmmiter.event;

    private selection: T[] = [];
    get selectedElements(): T[] { return this.selection; }

    constructor(private treeViewId: string, private treeDataProvider: TreeDataProvider<T>, proxy: TreeViewsMain) {
        super(() => {
            this.dispose();
        });

        proxy.$registerTreeDataProvider(treeViewId);

        if (treeDataProvider.onDidChangeTreeData) {
            treeDataProvider.onDidChangeTreeData((e: T) => {
                console.log('> onDidChangeTreeData !!!!');
            });
        }
    }

    dispose() {
        console.log('> disposing...');
    }

    async reveal(element: T, options?: { select?: boolean }): Promise<void> {
        await this.delay(1000);
    }

    async delay(miliseconds: number): Promise<any> {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, miliseconds);
        });
    }

    async getChildren(): Promise<TreeViewItem[] | undefined> {
        const result = await this.treeDataProvider.getChildren();

        if (result) {
            const treeItems: TreeViewItem[] = [];
            const promises = result.map(async value => {
                const treeItem = await this.treeDataProvider.getTreeItem(value);

                let label = treeItem.label;
                if (!label && treeItem.resourceUri) {
                    label = treeItem.resourceUri.toString();
                }

                const treeViewItem = {
                    label: label
                } as TreeViewItem;

                treeItems.push(treeViewItem);
            });

            await Promise.all(promises);
            return treeItems;
        } else {
            return undefined;
        }
    }

}
