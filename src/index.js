"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chooser_1 = require("./chooser");
const loader_1 = require("./loader");
const dropbox_1 = require("dropbox");
window.$tw = {
    boot: { suppressBoot: true, files: {} },
    preloadTiddlers: [
        { title: "$:/core/modules/savers/put.js", text: "" }
    ]
};
const url = new URL(location.href);
let options = {
    type: decodeURIComponent(url.searchParams.get('type') || ''),
    path: decodeURIComponent(url.searchParams.get('path') || ''),
    user: decodeURIComponent(url.searchParams.get('user') || '')
};
const OPTIONS_CACHE_KEY = "twits-options";
if (url.searchParams.get('source') === "oauth2") {
    //parse the oauth token
    options.token = {};
    let hashtoken = location.hash;
    if (hashtoken.startsWith("#"))
        hashtoken = hashtoken.slice(1);
    hashtoken.split('&').map((item) => {
        let part = item.split('=');
        options.token[part[0]] = decodeURIComponent(part[1]);
    });
    //parse the state, store everything, and redirect back to ?type=%type
    let { path, user, type, hash } = JSON.parse(decodeURIComponent(options.token.state) || '{}');
    if (type === options.type) {
        options.path = path;
        options.user = user;
    }
    if (!hash.startsWith("#"))
        hash = "#" + hash;
    sessionStorage.setItem(OPTIONS_CACHE_KEY, JSON.stringify(options));
    location.href = location.origin + location.pathname + "?type=" + options.type + hash;
}
else {
    let store = sessionStorage.getItem(OPTIONS_CACHE_KEY);
    sessionStorage.setItem(OPTIONS_CACHE_KEY, "");
    //if we have stored options, ignore anything else
    if (store)
        options = JSON.parse(store);
    options.hash = location.hash;
    if (options.type && !(options.token && options.token.access_token)) {
        if (options.type !== "full" && options.type !== "apps")
            throw "Invalid option type";
        var token = localStorage.getItem('twits-devtoken') || '';
        if (token)
            options.token = { access_token: token };
        location.href = new dropbox_1.Dropbox({ clientId: chooser_1.getAppKey(options.type) }).getAuthenticationUrl(encodeURIComponent(location.origin + location.pathname + "?source=oauth2&type=" + options.type), encodeURIComponent(JSON.stringify({
            type: options.type,
            path: options.path,
            user: options.user,
            hash: options.hash
        })));
    }
}
window.addEventListener('load', () => {
    if (!options.type) {
        var container = document.createElement('div');
        container.id = "twits-greeting";
        container.appendChild(chooser_1.Chooser.getHeaderElement());
        {
            var selector = document.createElement('div');
            selector.id = "twits-selector";
            selector.innerHTML = `
	<a class="access-full button" href="?type=full">Full Dropbox Access</a>
	<a class="access-apps button" href="?type=apps">Apps Folder Access</a>`;
            container.appendChild(selector);
        }
        container.appendChild(chooser_1.Chooser.getFooterElement());
        document.body.appendChild(container);
    }
    else {
        var container = document.createElement('div');
        container.id = 'twits-chooser';
        document.body.appendChild(container);
        var chooser = new chooser_1.Chooser(container, options);
        chooser.loadChooser((stat) => {
            container.style.display = "none";
            chooser.status.setStatusMessage("Loading...");
            chooser.cloud.filesDownload({ path: typeof stat === "string" ? stat : stat.path_lower })
                .then(stat => loader_1.handleDatafolder(chooser, stat));
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHVDQUErQztBQUMvQyxxQ0FBNEM7QUFHNUMscUNBQXlDO0FBRXhDLE1BQWMsQ0FBQyxHQUFHLEdBQUc7SUFDckIsSUFBSSxFQUFFLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO0lBQ3ZDLGVBQWUsRUFBRTtRQUNoQixFQUFFLEtBQUssRUFBRSwrQkFBK0IsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFO0tBQ3BEO0NBQ0QsQ0FBQztBQUVGLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNuQyxJQUFJLE9BQU8sR0FBUTtJQUNsQixJQUFJLEVBQUUsa0JBQWtCLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQzVELElBQUksRUFBRSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDNUQsSUFBSSxFQUFFLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztDQUM1RCxDQUFBO0FBQ0QsTUFBTSxpQkFBaUIsR0FBRyxlQUFlLENBQUE7QUFDekMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQztJQUNqRCx1QkFBdUI7SUFDdkIsT0FBTyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7SUFDbkIsSUFBSSxTQUFTLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQztJQUM5QixFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEdBQUcs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