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
import { BaseWidget, PanelLayout, Widget, Message, MessageLoop } from '@theia/core/lib/browser';
import { ConsoleSession } from './console-session';
import { DisposableCollection } from '@theia/core/lib/common';
import { MonacoEditor } from '@theia/monaco/lib/browser/monaco-editor';
import URI from '@theia/core/lib/common/uri';
import { MonacoEditorModel } from '@theia/monaco/lib/browser/monaco-editor-model';
import { ProtocolToMonacoConverter, MonacoToProtocolConverter } from 'monaco-languageclient/lib';
import { ElementExt } from '@phosphor/domutils';
import { ConsoleContentWidget } from './content/console-content-widget';
import { ConsoleSessionNode } from './content/console-content-tree';

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

    @inject(ConsoleContentWidget)
    protected readonly content: ConsoleContentWidget;

    protected input: MonacoEditor;

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

        this.content.node.className = ConsoleWidget.styles.content;
        this.toDispose.push(this.content);
        layout.addWidget(this.content);

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
        this.content.model.root = ConsoleSessionNode.to(session);
        if (this._session) {
            this.toDisposeOnSession.push(this._session.onDidChange(() => this.content.model.refresh()));
            this.toDispose.push(this.toDisposeOnSession);
        }
    }
    get session(): ConsoleSession | undefined {
        return this._session;
    }

    hasInputFocus(): boolean {
        return this.input.getControl().hasTextFocus();
    }

    async execute(): Promise<void> {
        const value = this.input.getControl().getValue();
        this.input.getControl().setValue('');
        // TODO: track history
        if (this.session) {
            const listener = this.content.model.onNodeRefreshed(() => {
                listener.dispose();
                this.revealLastOutput();
            });
            await this.session.execute(value);
        }
    }

    protected revealLastOutput(): void {
        const { root } = this.content.model;
        if (ConsoleSessionNode.is(root)) {
            this.content.model.selectNode(root.children[root.children.length - 1]);
        }
    }

    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        this.input.focus();
    }

    protected totalHeight = -1;
    protected totalWidth = -1;
    protected onResize(msg: Widget.ResizeMessage): void {
        super.onResize(msg);
        this.totalWidth = msg.width;
        this.totalHeight = msg.height;
        this.input.resizeToFit();
        this.resizeContent();
    }

    protected resizeContent(): void {
        this.totalHeight = this.totalHeight < 0 ? this.computeHeight() : this.totalHeight;
        const inputHeight = this.input.getControl().getLayoutInfo().height;
        const contentHeight = this.totalHeight - inputHeight;
        this.content.node.style.height = `${contentHeight}px`;
        MessageLoop.sendMessage(this.content, new Widget.ResizeMessage(this.totalWidth, contentHeight));
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
