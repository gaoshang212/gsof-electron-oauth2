import * as qs from 'querystring';
import * as nurl from 'url';
import * as isJson from 'is-json'

import { http } from "gsof-simple-async-http";

export class oauth {
    private webview: any;

    constructor(webview: any) {
        this.webview = webview;
    }

    public getAuthorizationCode(opts) {
        let webview = this.webview;
        if (!webview) {
            throw "the webview can be undefined or null.";
        }

        opts = opts || {};
        opts = { ...opts };

        let authorizationUrl = opts.authorizationUrl
        if (authorizationUrl) {
            delete opts.authorizationUrl;
        }

        let additionalAuthorization = opts.additionalAuthorization || '';
        if (opts.additionalAuthorization) {
            delete opts.additionalAuthorization;
        }

        if (!opts.response_type) {
            opts.response_type = 'code';
        }

        let aurl = `${authorizationUrl}?${qs.stringify(opts)}${additionalAuthorization}`;

        let promise = new Promise<any>((resolve, reject) => {
            webview.loadURL(aurl);

            let onparser = (url) => {
                let parts = nurl.parse(url, true);
                let query = parts.query;
                var code = query.code;
                var error = query.error;

                if (error !== undefined) {
                    reject(error);
                } else if (code) {
                    resolve(code);
                }

                return error || code;
            };

            function callback(event, oldurl, newurl) {
                const url = newurl || oldurl;
                if (!url.toLowerCase().startsWith(opts.redirect_uri)) {
                    return;
                }

                if (!onparser(url)) {
                    return;
                }

                event && event.preventDefault();

                webview.removeListener('will-navigate', callback);
                //webview.removeListener('did-start-navigation', callback);
                webview.removeListener('will-redirect', callback);

                const electron = require('electron');
                if (electron && webview.getType() === 'browserView') {
                    const window = electron.remote.BrowserWindow.fromWebContents(webview);
                    window && window.hide();
                }

            };

            webview.on('will-navigate', callback);
            //webview.on('did-start-navigation', callback);
            webview.on('will-redirect', callback);
        });
        return promise;
    }

    public async getAccessToken(opts) {
        opts = opts || {};
        opts = { ...opts };
        let tokenUrl = opts.tokenUrl;
        let method = opts.method || 'get';
        let additionalToken = opts.additionalToken || {};

        if (opts.tokenUrl) {
            delete opts.tokenUrl;
        }

        if (opts.method) {
            delete opts.method;
        }

        if (opts.additionalToken) {
            delete opts.additionalToken;
        }

        if (!opts.state) {
            opts.state = this.generateRandomString(16);
        }

        if (!opts.code) {
            opts.code = await this.getAuthorizationCode(opts);
        }

        if (!opts.grant_type) {
            opts.grant_type = 'authorization_code';
        }

        if (additionalToken) {
            opts = Object.assign(opts, additionalToken);
        }

        let body = await http.text(tokenUrl, { method: method, params: opts });

        let result = isJson(body) ? JSON.parse(body) : qs.parse(body);

        return result;
    }

    private generateRandomString(length: number): string {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let text = '';

        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}