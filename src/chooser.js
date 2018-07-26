"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dropbox_1 = require("dropbox");
const common_1 = require("./common");
const devtoken_1 = require("../devtoken");
const SESSION_KEY = 'twcloud-dropbox-session';
const ORIGINAL_KEY = 'twcloud-dropbox-original';
const SCRIPT_KEY = 'twcloud-dropbox-script';
const PRELOAD_KEY = 'twcloud-dropbox-preload';
const SCRIPT_CACHE = "201807041";
class Chooser {
    constructor(container, options) {
        this.container = container;
        this.user = undefined;
        this.apiKeyFull = "gy3j4gsa191p31x";
        this.apiKeyApps = "tu8jc7jsdeg55ta";
        this.filelist = {};
        this.openFile = () => { };
        this.status = new common_1.StatusHandler("");
        if (options.type !== "apps" && options.type !== "full") {
            this.status.setStatusMessage("type must be apps or full");
            throw "type must be apps or full";
        }
        this.type = options.type;
        this.client = new dropbox_1.Dropbox({
            clientId: this.getKey()
        });
        //save the preload info in case we don't have a dropbox token
        this.preload = {
            user: options.user,
            path: options.path,
            type: options.type
        };
        //if the hash has the access_token then it is the dropbox oauth response
        this.token = devtoken_1.devtoken;
        this.client.setAccessToken(this.token.access_token);
        // if (options.hash && options.hash !== "#") {
        // 	const data = (options.hash[0] === "#" ? options.hash.slice(1) : options.hash)
        // 		.split('&').map(e => e.split('=').map(f => decodeURIComponent(f)));
        // 	if (data.find(e => Array.isArray(e) && (e[0] === "access_token"))) {
        // 		data.forEach(e => {
        // 			this.token[e[0]] = e[1];
        // 		});
        // 		this.client.setAccessToken(this.token.access_token);
        // 		//the oauth response will only have a type and hash argument
        // 		var preload = sessionStorage.getItem(PRELOAD_KEY);
        // 		if (preload) this.preload = JSON.parse(preload);
        // 		sessionStorage.setItem(PRELOAD_KEY, '');
        // 	}
        // }
    }
    getKey() {
        return (this.type === "full" ? this.apiKeyFull : (this.type === "apps" ? this.apiKeyApps : ""));
    }
    loadChooser(callback) {
        this.openFile = callback;
        if (!this.token.access_token) {
            if (this.preload.path)
                sessionStorage.setItem(PRELOAD_KEY, JSON.stringify(this.preload));
            else
                sessionStorage.setItem(PRELOAD_KEY, '');
            location.href = this.client.getAuthenticationUrl(location.origin + location.pathname + "?type=" + this.type);
            return;
        }
        this.client.usersGetCurrentAccount(undefined).then(res => {
            this.user = res;
            if (this.preload.user
                && (this.user.account_id !== this.preload.user
                    || this.token.account_id !== this.preload.user
                    || this.type !== this.preload.type)) {
                alert('You are logged into a different dropbox account than the one specified in this link');
                delete this.preload.user;
                delete this.preload.path;
                delete this.preload.type;
            }
            this.status = new common_1.StatusHandler(this.user.profile_photo_url || "");
            this.container.appendChild(this.getHeaderElement());
            this.container.appendChild(this.getUserProfileElement());
            this.container.appendChild(this.getFilesListElement());
            this.readFolder("", document.getElementById('twits-files'));
            // this.openFile("/arlennotes/arlen-china/tiddlywiki.info");
        });
    }
    getHeaderElement() {
        const header = document.createElement('div');
        header.id = "twits-header";
        header.innerHTML = `<h1>TiddlyWiki in the Sky<br> using Dropbox <span class="twits-beta">beta</span> <br/> (by <a href="https://github.com/Arlen22">@Arlen22</a>*)</h1>`;
        return header;
    }
    getUserProfileElement() {
        const profile = document.createElement('div');
        profile.id = "twits-profile";
        const pic = document.createElement('img');
        pic.src = this.user.profile_photo_url || "";
        pic.classList.add("profile-pic");
        profile.appendChild(pic);
        const textdata = document.createElement('span');
        textdata.innerText = this.user.name.display_name
            + (this.user.team ? ("\n" + this.user.team.name) : "");
        textdata.classList.add(this.user.team ? "profile-name-team" : "profile-name");
        profile.appendChild(textdata);
        return profile;
    }
    getFilesListElement() {
        const el = document.createElement('div');
        el.id = "twits-files";
        return el;
    }
    isFileMetadata(a) {
        return a[".tag"] === "file";
    }
    isFolderMetadata(a) {
        return a[".tag"] === "folder";
    }
    isHtmlFile(stat) {
        return ['.htm', '.html'].indexOf(stat.name.slice(stat.name.lastIndexOf('.'))) > -1;
    }
    isTWInfoFile(stat) {
        return stat.name === "tiddlywiki.info";
    }
    getHumanSize(size) {
        const TAGS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        let power = 0;
        while (size >= 1024) {
            size /= 1024;
            power++;
        }
        return size.toFixed(1) + TAGS[power];
    }
    streamFilesListFolder(folderpath, handler) {
        const resHandler = (res) => {
            handler(res.entries, !!res.has_more);
            if (res.has_more) {
                return this.client.filesListFolderContinue({
                    cursor: res.cursor
                }).then(resHandler);
            }
            else {
                return Promise.resolve();
            }
        };
        this.client.filesListFolder({
            path: folderpath
        }).then(resHandler);
    }
    readFolder(folderpath, parentNode) {
        const pageurl = new URL(location.href);
        const loadingMessage = document.createElement("li");
        loadingMessage.innerText = "Loading...";
        loadingMessage.classList.add("loading-message");
        var listParent = document.createElement("ol");
        listParent.appendChild(loadingMessage);
        parentNode.appendChild(listParent);
        const filelist = [];
        this.streamFilesListFolder(folderpath, (stats, has_more) => {
            filelist.push.apply(filelist, stats);
            stats.forEach(e => this.filelist[e.path_lower] = e);
            loadingMessage.innerText = "Loading " + filelist.length + "...";
            if (has_more)
                return;
            loadingMessage.remove();
            filelist.sort((a, b) => {
                //order by isFolder DESC, name ASC
                return (+this.isFolderMetadata(b) - +this.isFolderMetadata(a))
                    || a.name.localeCompare(b.name);
            });
            for (var t = 0; t < filelist.length; t++) {
                const stat = filelist[t];
                var listItem = document.createElement("li"), classes = [];
                if (this.isFolderMetadata(stat)) {
                    classes.push("twits-folder");
                }
                else if (this.isFileMetadata(stat)) {
                    classes.push("twits-file");
                    if (this.isHtmlFile(stat)) {
                        classes.push("twits-file-html");
                    }
                    else if (this.isTWInfoFile(stat)) {
                        classes.push("twits-file-twinfo");
                    }
                }
                var link;
                classes.push("twits-file-entry");
                if (this.isFolderMetadata(stat) || (this.isFileMetadata(stat) && (this.isHtmlFile(stat) || this.isTWInfoFile(stat)))) {
                    link = document.createElement("a");
                    link.href = location.origin + location.pathname + location.search
                        + "&path=" + encodeURIComponent(stat.path_lower)
                        + "&user=" + encodeURIComponent(this.user.account_id) + location.hash;
                    link.setAttribute("data-twits-path", stat.path_lower);
                    link.addEventListener("click", this.onClickFolderEntry(), false);
                }
                else {
                    link = document.createElement("span");
                }
                link.className = classes.join(" ");
                var img = document.createElement("img");
                img.src = "dropbox-icons-broken.gif";
                img.style.width = "16px";
                img.style.height = "16px";
                link.appendChild(img);
                link.appendChild(document.createTextNode(stat.name));
                var size;
                if (this.isFileMetadata(stat) && this.getHumanSize(stat.size)) {
                    size = document.createElement("span");
                    size.appendChild(document.createTextNode(" (" + this.getHumanSize(stat.size) + ")"));
                    //link.appendChild(size);
                }
                listItem.appendChild(link);
                if (size)
                    listItem.appendChild(size);
                listParent.appendChild(listItem);
            }
        });
    }
    ;
    onClickFolderEntry() {
        const self = this;
        return function (event) {
            if (event.altKey || event.ctrlKey || event.shiftKey)
                return true;
            var filepath = this.getAttribute("data-twits-path") || "";
            if (this.classList.contains("twits-folder") && !this.classList.contains("twits-folder-open")) {
                this.classList.add("twits-folder-open");
                self.readFolder(filepath, this.parentNode);
            }
            else {
                var type = this.classList.contains("twits-file-html") ? "htmlfile" :
                    this.classList.contains("twits-file-twinfo") ? "datafolder" : "";
                var meta = self.filelist[filepath];
                self.openFile(self.isFileMetadata(meta) ? meta : filepath);
            }
            event.preventDefault();
            return false;
        };
    }
}
exports.Chooser = Chooser;
