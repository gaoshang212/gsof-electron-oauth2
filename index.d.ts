export declare class oauth {
    private webview;
    constructor(webview: any);
    getAuthorizationCode(opts: any): Promise<any>;
    getAccessToken(opts: any): Promise<any>;
    private generateRandomString;
}
