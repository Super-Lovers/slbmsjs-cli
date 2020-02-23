#!/usr/bin/env node

const bookmarksParser = require('bookmark-parser');
const fs = require('fs');
const chalk = require('chalk');
const inquirer = require('inquirer');
const openurl2 = require('openurl2');
const Spinner = require('cli-spinner').Spinner;
const Fuse = require('fuse.js');
const {
    getInstalledPath
} = require('get-installed-path');

let librariesLeftToImport = 0;
let folders = [];
let allBookmarks = [];

console.log('     _ _                   ');
console.log(' ___| | |__  _ __ ___  ___ ');
console.log(`/ __| | |_ \\| \'_  \` _\\/ __|`);
console.log('\\__ | | |_) | | | | | \\__ \\');
console.log('|___|_|_.__/|_| |_| |_|___/');
console.log(chalk `{blue The simple bookmarks viewer}`);
console.log();

getInstalledPath('slbms.js').then((path) => {
    fs.exists(path + '/imported-data.json', result => {
        if (result == false) {
            fs.exists(path + '/bookmarks', doesFolderExist => {
                if (doesFolderExist == false) {
                    throw new Error(chalk `{red Please create a "bookmarks" folder in the root of the package folder (${__dirname}) and add at least one html json bookmarks backup file in it.}`);
                }
            });

            fs.readdir(path + '/bookmarks', (err, files) => {
                if (files == null || files == undefined || files.length == 0) {
                    throw new Error(chalk `{red Please add at least one html json bookmarks backup file in the bookmarks folder of the root folder of the package (${__dirname}). Create a bookmarks folder if it does not exist.}`);
                }

                librariesLeftToImport = files.length;
                files.forEach(file => {
                    importBookmarks(file);
                });
            });
        } else if (result == true) {
            let data = fs.readFileSync(path + '/imported-data.json', 'utf8');
            allBookmarks = JSON.parse(data);

            prompt();
        }
    });
});

// Query options
// ******************************
let searchOptions = {
    shouldSort: true,
    includeMatches: true,
    findAllMatches: true,
    threshold: 0.5,
    keys: ['name', 'fromFolder', 'creationDate', 'url']
}

let queryMethodOptions = {
    type: 'list',
    name: 'method',
    message: 'Select query method',
    choices: [
        'Group',
        'Sort',
        'Keywords',
        'Settings'
    ]
};

let groupByOptions = {
    type: 'list',
    name: 'parameter',
    message: 'Parameter',
    choices: ['Back', 'Address']
};

let sortByOptions = {
    type: 'list',
    name: 'parameter',
    message: 'Parameter',
    choices: ['Back', 'Oldest', 'Newest']
};

let keywordsOptions = {
    type: 'input',
    name: 'keywords',
    message: 'Please enter the keywords to search by: '
};

let settingsOptions = {
    type: 'list',
    name: 'parameter',
    message: 'Option',
    choices: ['Back', 'Re-import bookmarks']
};
// ******************************

function queryAnswer(answer) {
    if (answer.method == 'Group') {
        inquirer.prompt([groupByOptions])
            .then(answer => groupQueryBy(answer));
    } else if (answer.method == 'Sort') {
        inquirer.prompt([sortByOptions])
            .then(answer => queryBySorting(answer));
    } else if (answer.method == 'Keywords') {
        inquirer.prompt([keywordsOptions])
            .then(answer => queryByKeywords(answer));
    } else if (answer.method == 'Settings') {
        inquirer.prompt([settingsOptions])
            .then(answer => openOptionsQuery(answer));
    }
}

function openOptionsQuery(answer) {
    getInstalledPath('slbms.js').then((path) => {
        if (answer.parameter == 'Re-import bookmarks') {
            fs.readdir(path + '/bookmarks', (err, files) => {
                librariesLeftToImport = files.length;
                files.forEach(file => {
                    importBookmarks(file);
                });
            });
        } else if (answer.parameter == 'Back') {
            prompt();
        }
    });
}

function queryBySorting(answer) {
    if (answer.parameter == 'Newest') {
        sortBookmarksIn('Newest');
    } else if (answer.parameter == 'Oldest') {
        sortBookmarksIn('Oldest');
    } else if (answer.parameter == 'Back') {
        prompt();
    }
}

function sortBookmarksIn(order) {
    let sortedBookmarks = JSON.parse(JSON.stringify(allBookmarks));

    sortedBookmarks.forEach(bookmark => {
        let date;
        if (bookmark.creationDate !== null && bookmark.creationDate !== undefined) {
            date = bookmark.creationDate;
        } else {
            date = 'No Date';
        }

        let name = bookmark.name;
        let url = bookmark.url;

        bookmark.name = chalk `{underline ${date} => ${name} =>{bold  ${url}}}`;
    });

    if (order == 'Newest') {
        sortedBookmarks.sort((a, b) => new Date(a.creationDate) > new Date(b.creationDate) ? -1 : 1);
    } else if (order == 'Oldest') {
        sortedBookmarks.sort((a, b) => new Date(a.creationDate) > new Date(b.creationDate) ? 1 : -1);
    }

    inquirer
        .prompt([{
            type: 'list',
            name: 'result',
            message: chalk `{green ✓ Sorted bookmarks in order of ${
                order == 'Newest' ? 'newest' : 'oldest'}}`,
            choices: sortedBookmarks
        }])
        .then(bookmarkPicked => pickBookmark(bookmarkPicked));
}

function queryByKeywords(answer) {
    if (answer.keywords == '') {
        console.log(chalk `{red ✗ Please give at least one keyword to make a search}`);
        prompt();
        return;
    }

    let spinner = new Spinner(chalk `%s {yellow Searching for matches}`);
    spinner.setSpinnerString('⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏');
    spinner.start();

    const fuseQuery = new Fuse(allBookmarks, searchOptions);
    let matches = [];
    let result = fuseQuery.search(answer.keywords).forEach(item => {
        item.item.name = chalk `{underline ${item.item.name.substring(0, 100)}} => ${item.item.url}`;
        matches.push(item.item);
    });

    spinner.stop();

    console.log();
    if (matches.length == 0) {
        console.log('No matches were found');
        prompt();
        return;
    }

    inquirer
        .prompt([{
            type: 'list',
            name: 'result',
            message: `Results (${matches.length}):`,
            choices: matches
        }])
        .then(bookmarkPicked => pickBookmark(bookmarkPicked));
}

function removeInquirerListeners() {
    // inquirer.remove
}

function pickBookmark(bookmarkPicked) {
    let regexForUrls = new RegExp(/(?<Protocol>\w+):\/\/(?<Domain>[\w@][\w.:@]+)\/?[\w\.?=%&=\-@\/$,]*/);
    let urlResult = regexForUrls.exec(bookmarkPicked.result);

    openBookmarkLink(urlResult[0]);
}

function groupQueryBy(answer) {
    if (answer.parameter == 'Address') {
        groupByAddress();
    } else if (answer.parameter == 'Back') {
        prompt();
    }
}

function prompt() {
    inquirer
        .prompt([queryMethodOptions])
        .then(answer => queryAnswer(answer));
}

function groupByAddress() {
    let groups = [];
    let allDomains = [];

    for (let i = 0; i < allBookmarks.length; i++) {
        let regexForDomains = new RegExp(/(?<Protocol>\w+):\/\/(?<Domain>[\w@][\w.:@]+)\/?[\w\.?=%&=\-@\/$,]*/);
        let result = regexForDomains.exec(allBookmarks[i].url);
        if (result !== null && result !== undefined) {
            let domainString = result[2];

            let domainObj = {
                domain: domainString,
                count: 1
            };

            let isDomainInGroups = false;
            for (let j = 0; j < groups.length; j++) {
                if (groups[j].domain == domainObj.domain) {
                    groups[j].count++;
                    isDomainInGroups = true;
                    break;
                }
            }

            if (isDomainInGroups == false) {
                groups.push(domainObj);
            }
        }
    }

    groups.sort((a, b) => a.count > b.count ? -1 : 1);

    for (let i = 0; i < groups.length; i++) {
        // let message = chalk `{underline ${groups[i].domain}} => ${
        //     groups[i].count} ${groups[i].count > 1 ? 'occurrences' : 'occurrence'}`;
        let message = `${groups[i].domain} => ${groups[i].count} ${(groups[i].count > 1 ? 'occurrences' : 'occurrence')}`;

        allDomains.push(message);
    }

    inquirer
        .prompt([{
            type: 'list',
            name: 'result',
            message: `Results (${groups.length}):`,
            choices: allDomains
        }])
        .then(domain => displayDomainGroup(domain));
}

function displayDomainGroup(domain) {
    let bookmarksFromDomain = [];

    let regexForBookmarks = new RegExp(/(?<Domain>[\w@][\w.:@]+)\/?[\w\.?=%&=\-@\/$,]*/);
    let result = regexForBookmarks.exec(domain.result);
    let domainString = result[0];

    for (let i = 0; i < allBookmarks.length; i++) {
        let regexForBookmarks = new RegExp(domainString);
        let result = regexForBookmarks.exec(allBookmarks[i].url);

        if (result !== null && result !== undefined) {
            bookmarksFromDomain.push(result);
        }
    }

    let listOfBookmarks = [];
    bookmarksFromDomain.forEach(element => {
        listOfBookmarks.push(element.input);
    });

    inquirer
        .prompt([{
            type: 'list',
            name: 'result',
            message: `Domain group matches (${listOfBookmarks.length}):`,
            choices: listOfBookmarks
        }])
        .then(bookmark => openBookmarkLink(bookmark.result));
}

function openBookmarkLink(bookmarkLink) {
    let spinner = new Spinner(chalk `%s {yellow Opening ${bookmarkLink}}`);
    spinner.setSpinnerString('⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏');
    spinner.start();

    openurl2.open(bookmarkLink, () => {
        console.log(chalk `\n{green ✓ Finished opening ${bookmarkLink}}`);
        spinner.stop();

        prompt();
    });
}

function answer(input) {
    if (input == 'Y' ||
        input == 'y' ||
        input == 'Yes' ||
        input == 'yes') {
        return true;
    } else if (input == 'N' ||
        input == 'n' ||
        input == 'No' ||
        input == 'no') {
        return false;
    }

    return true;
}

function importBookmarks(htmlFile) {
    allBookmarks = [];
    let spinner = new Spinner(chalk `Importing {blue ${htmlFile}} bookmarks file...`);
    spinner.setSpinnerString('⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏');
    spinner.start();

    getInstalledPath('slbms.js').then((path) => {
        bookmarksParser
            .readFromHTMLFile(path + `/bookmarks/${htmlFile}`)
            .then(obj => {
                obj.Bookmarks.children.forEach(bookmarksFolder => {
                    getBookmarks(bookmarksFolder);
                });
    
                spinner.stop();
                console.log(chalk `Completed Importing {blue ${htmlFile}} bookmarks file`);
                librariesLeftToImport--;
    
                if (librariesLeftToImport == 0) {
                    fs.writeFile(path + '/imported-data.json', JSON.stringify(allBookmarks), () => {
                        prompt();
                    });
                }
            });
    });
}

function getBookmarks(folder) {
    if (Array.isArray(folder.children) && folder.children.length > 0) {
        let bookmarksContainer = {
            name: folder.name,
            bookmarks: []
        };

        folder.children
            .forEach(bookmark => {
                if (bookmark.type == 'folder') {
                    getBookmarks(bookmark);
                }

                if (bookmark.type == 'bookmark') {
                    var utcSeconds = bookmark.addDate;
                    var date = new Date(0);
                    date.setUTCSeconds(utcSeconds);

                    let newBookmark = {
                        name: bookmark.name,
                        creationDate: date.toLocaleString(),
                        url: bookmark.url,
                        fromFolder: bookmarksContainer.name
                    };

                    allBookmarks.push(newBookmark);
                    bookmarksContainer.bookmarks.push(newBookmark);
                }
            });

        if (bookmarksContainer.bookmarks.length > 0) {
            folders.push(bookmarksContainer);

            console.log();
            console.log(chalk `Imported library {green ${bookmarksContainer.name}} => ${folder.children.length} bookmarks`);
        }
    }
}
