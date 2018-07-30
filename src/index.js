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