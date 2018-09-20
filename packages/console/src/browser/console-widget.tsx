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

import * as React from 'react';
import { injectable, inject, postConstruct } from 'inversify';
import { BaseWidget, PanelLayout, Widget, Message, ReactWidget } from '@theia/core/lib/browser';
import { ConsoleSession, ConsoleItem } from './console-session';
import { DisposableCollection } from '@theia/core/lib/common';
import { MonacoEditor } from '@theia/monaco/lib/browser/monaco-editor';
import URI from '@theia/core/lib/common/uri';
import { MonacoEditorModel } from '@theia/monaco/lib/browser/monaco-editor-model';
import { ProtocolToMonacoConverter, MonacoToProtocolConverter } from 'monaco-languageclient/lib';
import { ElementExt } from '@phosphor/domutils';

export const ConsoleOptions = Symbol('ConsoleWidgetOptions');
export interface ConsoleOptions {
    id: string
    label?: string
    iconClass?: string
    caption?: string
}

@injectable()
export class ConsoleWidget extends BaseWidget {

    static ID = 'console';

    static styles = {
        node: 'theia-console-widget',
        content: 'theia-console-content',
        input: 'theia-console-input',
    };

    @inject(ConsoleOptions)
    protected readonly options: ConsoleOptions;

    @inject(MonacoToProtocolConverter)
    protected readonly m2p: MonacoToProtocolConverter;

    @inject(ProtocolToMonacoConverter)
    protected readonly p2m: ProtocolToMonacoConverter;

    protected input: MonacoEditor;
    protected content: ConsoleContentWidget;

    constructor() {
        super();
        this.node.className = ConsoleWidget.styles.node;
    }

    @postConstruct()
    protected async init(): Promise<void> {
        const { id, label, iconClass, caption } = this.options;
        this.id = ConsoleWidget.ID + ':' + id;
        this.title.closable = true;
        this.title.label = label || id;
        if (iconClass) {
            this.title.iconClass = iconClass;
        }
        this.title.caption = caption || label || id;

        const layout = this.layout = new PanelLayout();

        const content = this.content = new ConsoleContentWidget();
        content.node.className = ConsoleWidget.styles.content;
        this.toDispose.push(content);
        layout.addWidget(content);

        const inputWidget = new Widget();
        inputWidget.node.className = ConsoleWidget.styles.input;
        layout.addWidget(inputWidget);

        const uri = new URI('console://' + id);
        const document = new MonacoEditorModel({
            uri,
            readContents: async () => '',
            dispose: () => { }
        }, this.m2p, this.p2m);
        this.toDispose.push(document);

        const model = (await document.load()).textEditorModel;
        const input = this.input = new MonacoEditor(
            uri,
            document,
            inputWidget.node,
            this.m2p,
            this.p2m,
            Object.assign({
                model,
                isSimpleWidget: true,
                autoSizing: true,
                minHeight: 1,
                maxHeight: 10
            }, ConsoleWidget.EDITOR_OPTIONS)
        );
        this.toDispose.push(input);
        this.toDispose.push(input.getControl().onDidLayoutChange(() => this.resizeContent()));
    }

    protected _session: ConsoleSession | undefined;
    protected readonly toDisposeOnSession = new DisposableCollection();
    set session(session: ConsoleSession | undefined) {
        if (this._session === session) {
            return;
        }
        this._session = session;
        this.content.session = session;
        if (this._session) {
            this.toDisposeOnSession.push(this._session.onDidChange(() => this.update()));
            this.toDispose.push(this.toDisposeOnSession);
        }
        this.update();
    }
    get session(): ConsoleSession | undefined {
        return this._session;
    }

    hasInputFocus(): boolean {
        return this.input.getControl().hasTextFocus();
    }

    execute(): void {
        const value = this.input.getControl().getValue();
        this.input.getControl().setValue('');
        // TODO: track history
        if (this.session) {
            this.session.execute(value);
        }
    }

    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        this.input.focus();
    }

    protected onUpdateRequest(msg: Message): void {
        super.onUpdateRequest(msg);
        this.content.update();
    }

    protected totalHeight = -1;
    protected onResize(msg: Widget.ResizeMessage): void {
        super.onResize(msg);
        this.totalHeight = msg.height;
        this.input.resizeToFit();
        this.resizeContent();
    }

    protected resizeContent(): void {
        this.totalHeight = this.totalHeight < 0 ? this.computeHeight() : this.totalHeight;
        const inputHeight = this.input.getControl().getLayoutInfo().height;
        const contentHeight = this.totalHeight - inputHeight;
        this.content.node.style.height = `${contentHeight}px`;
    }

    protected computeHeight(): number {
        const { verticalSum } = ElementExt.boxSizing(this.node);
        return this.node.offsetHeight - verticalSum;
    }

    static EDITOR_OPTIONS: monaco.editor.IEditorConstructionOptions = {
        wordWrap: 'on',
        overviewRulerLanes: 0,
        glyphMargin: false,
        lineNumbers: 'off',
        folding: false,
        selectOnLineNumbers: false,
        hideCursorInOverviewRuler: true,
        selectionHighlight: false,
        scrollbar: {
            horizontal: 'hidden'
        },
        lineDecorationsWidth: 0,
        overviewRulerBorder: false,
        scrollBeyondLastLine: false,
        renderLineHighlight: 'none',
        fixedOverflowWidgets: true,
        acceptSuggestionOnEnter: 'smart',
        minimap: {
            enabled: false
        }
    };

}
export class ConsoleContentWidget extends ReactWidget {

    session: ConsoleSession | undefined;

    protected render(): React.ReactNode {
        if (!this.session) {
            return undefined;
        }
        return <React.Fragment>{
            this.session.items.map((item, key) => this.renderItem(item, key))
        }</React.Fragment>;
    }
    protected renderItem(item: ConsoleItem, key: number): React.ReactNode {
        const className = ConsoleItem.toClassName(item);
        return <div key={key} className={className}>{item.render()}</div>;
    }

}
