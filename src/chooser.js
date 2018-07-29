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
        this.token = {};
        // this.client.setAccessToken(this.token.access_token);
        if (options.hash && options.hash !== "#") {
            const data = (options.hash[0] === "#" ? options.hash.slice(1) : options.hash)
                .split('&').map(e => e.split('=').map(f => decodeURIComponent(f)));
            if (data.find(e => Array.isArray(e) && (e[0] === "access_token"))) {
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
            this.container.appendChild(this.getHeaderElement());
            this.container.appendChild(this.getUserProfileElement());
            this.container.appendChild(this.getFilesListElement());
            this.readFolder("", document.getElementById('twits-files'));
            // this.openFile("/arlennotes/arlen-nature/tiddlywiki.info");
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