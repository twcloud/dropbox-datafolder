"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dropbox_1 = require("dropbox");
const common_1 = require("./common");
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
        // this.token = devtoken as any;
        // this.client.setAccessToken(this.token.access_token);
        if (options.hash && options.hash !== "#") {
            const data = (options.hash[0] === "#" ? options.hash.slice(1) : options.hash)
                .split('&').map(e => e.split('=').map(f => decodeURIComponent(f)));
            if (data.find(e => Array.isArray(e) && (e[0] === "access_token"))) {
                this.token = {};
                data.forEach(e => {
                    this.token[e[0]] = e[1];
                });
                this.client.setAccessToken(this.token.access_token);
                //the oauth response will only have a type and hash argument
                var preload = sessionStorage.getItem(PRELOAD_KEY);
                if (preload)
                    this.preload = JSON.parse(preload);
                sessionStorage.setItem(PRELOAD_KEY, '');
            }
        }
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
            // this.container.appendChild(this.getHeaderElement());
            // this.container.appendChild(this.getUserProfileElement());
            // this.container.appendChild(this.getFilesListElement());
            // this.readFolder("", document.getElementById('twits-files') as Node);
            this.openFile("/arlennotes/arlen-nature/tiddlywiki.info");
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
            filelist.sort((a, b) => 
            //order by isFolder DESC, name ASC
            (+this.isFolderMetadata(b) - +this.isFolderMetadata(a)) || a.name.localeCompare(b.name));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hvb3Nlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNob29zZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxQ0FBc0Q7QUFDdEQscUNBQXlDO0FBR3pDLE1BQU0sV0FBVyxHQUFHLHlCQUF5QixDQUFDO0FBQzlDLE1BQU0sWUFBWSxHQUFHLDBCQUEwQixDQUFDO0FBQ2hELE1BQU0sVUFBVSxHQUFHLHdCQUF3QixDQUFDO0FBQzVDLE1BQU0sV0FBVyxHQUFHLHlCQUF5QixDQUFDO0FBQzlDLE1BQU0sWUFBWSxHQUFHLFdBQVcsQ0FBQztBQWVqQztJQWNDLFlBQW1CLFNBQXlCLEVBQUUsT0FBcUI7UUFBaEQsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7UUFaNUMsU0FBSSxHQUFzQixTQUFnQixDQUFDO1FBRzNDLGVBQVUsR0FBRyxpQkFBaUIsQ0FBQTtRQUM5QixlQUFVLEdBQUcsaUJBQWlCLENBQUE7UUFFOUIsYUFBUSxHQUEyQyxFQUFFLENBQUM7UUEwQ3RELGFBQVEsR0FBcUIsUUFBUSxDQUFDLENBQUM7UUFuQ3RDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxzQkFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3BDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssTUFBTSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN4RCxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLDJCQUEyQixDQUFDLENBQUM7WUFDMUQsTUFBTSwyQkFBMkIsQ0FBQztRQUNuQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxpQkFBTyxDQUFDO1lBQ3pCLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFO1NBQ3ZCLENBQUMsQ0FBQztRQUNILDZEQUE2RDtRQUM3RCxJQUFJLENBQUMsT0FB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