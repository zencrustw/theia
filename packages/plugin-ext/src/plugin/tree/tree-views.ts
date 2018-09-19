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

import { RPCProtocol } from '../../api/rpc-protocol';
import { TreeDataProvider, TreeView, TreeViewExpansionEvent } from '@theia/plugin';
import { Emitter } from '@theia/core';
import { Disposable } from '../types-impl';

export class TreeViewsExtImpl {

    private treeViews: Map<string, TreeViewExt<any>> = new Map<string, TreeViewExt<any>>();

    constructor() {
        console.log('> TreeViewsExtImpl');
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

        const treeView = new TreeViewExt(viewId, options.treeDataProvider);
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

}

class TreeViewExt<T> extends Disposable {

    // = this._register(new Emitter<vscode.TreeViewExpansionEvent<T>>());
    private onDidExpandElementEmmiter: Emitter<TreeViewExpansionEvent<T>> = new Emitter<TreeViewExpansionEvent<T>>();
    public readonly onDidExpandElement = this.onDidExpandElementEmmiter.event;

    private onDidCollapseElementEmmiter: Emitter<TreeViewExpansionEvent<T>> = new Emitter<TreeViewExpansionEvent<T>>();
    public readonly onDidCollapseElement = this.onDidCollapseElementEmmiter.event;

    private selection: T[] = [];
    get selectedElements(): T[] { return this.selection; }

    constructor(viewId: string, treeDataProvider: TreeDataProvider<T>) {
        super(() => {
            console.log('<< dispose TreeVieExt');
        });

        console.log('> creating TreeViewExt');

        console.log('> viewId ', viewId);
        console.log('> treeDataProvider ', treeDataProvider);
    }

    dispose() {
        console.log('> disposing...');
    }

    reveal(element: T, options?: { select?: boolean }): Thenable<void> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                console.log('< time!');
                resolve();
            }, 3000);
        });
    }

}
