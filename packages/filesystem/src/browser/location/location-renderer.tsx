/********************************************************************************
 * Copyright (C) 2017 TypeFox and others.
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

import URI from '@theia/core/lib/common/uri';
import { LocationService } from './location-service';
import { ReactRenderer } from '@theia/core/lib/browser/widgets/react-renderer';
import * as React from 'react';

export const LOCATION_LIST_CLASS = 'theia-LocationList';

export class LocationListRenderer extends ReactRenderer {

    constructor(
        readonly service: LocationService,
        host?: HTMLElement
    ) {
        super(host);
    }

    render(): void {
        super.render();
        const locationList = this.locationList;
        if (locationList) {
            const currentLocation = this.service.location;
            locationList.value = currentLocation ? currentLocation.toString() : '';
        }
    }

    protected readonly handleLocationChanged = (e: React.ChangeEvent<HTMLSelectElement>) => this.onLocationChanged(e);
    protected async doRender(): Promise<React.ReactNode> {
        const location = this.service.location;
        const locations = (!!location ? location.allLocations : []).map(uri => ({ uri }));
        if (locations.length > 0) {
            const drives = (await this.service.drives()).map(uri => ({ uri, drive: true }));
            drives.forEach(drive => {
                const index = locations.findIndex(loc => loc.uri.toString() === drive.uri.toString());
                // Ignore drives which are already discovered as a location based on the current model root URI.
                if (index === -1) {
                    locations.push(drive);
                }
            });
        }
        const options = locations.map(value => this.renderLocation(value));
        return <select className={LOCATION_LIST_CLASS} onChange={this.handleLocationChanged}>{...options}</select>;
    }

    protected renderLocation(location: { uri: URI, drive?: boolean }): React.ReactNode {
        const { uri, drive } = location;
        const value = uri.toString();
        return <option value={value} key={uri.toString()}>{drive ? uri.path.toString() : uri.displayName}</option>;
    }

    protected onLocationChanged(e: React.ChangeEvent<HTMLSelectElement>): void {
        const locationList = this.locationList;
        if (locationList) {
            const value = locationList.value;
            const uri = new URI(value);
            this.service.location = uri;
        }
        e.preventDefault();
        e.stopPropagation();
    }

    get locationList(): HTMLSelectElement | undefined {
        const locationList = this.host.getElementsByClassName(LOCATION_LIST_CLASS)[0];
        if (locationList instanceof HTMLSelectElement) {
            return locationList;
        }
        return undefined;
    }

}
