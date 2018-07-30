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
    if (!(options.token && options.token.access_token)) {
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
        container.innerHTML = `
	<h1>
		TiddlyWiki in the Sky<br> on Dropbox <span class="twits-beta">beta</span> <br/> (by <a href="https://github.com/Arlen22">@Arlen22</a>*)
	</h1>
	<p>
		This app enables you to directly edit TiddlyWiki data folders and files stored in your Dropbox. 
		It runs entirely in your browser so we never upload it anywhere except directly to your Dropbox account. 
	</p>
	<div id="twits-selector">
		<a class="access-full button" href="?type=full">Full Dropbox Access</a>
		<a class="access-apps button" href="?type=apps">Apps Folder Access</a>
	</div>`;
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