#!/usr/bin/env node
/* eslint-disable no-empty-function */
/* eslint-disable no-shadow */

// Libraries
const bookmarksParser = require('bookmark-parser');
const fs = require('fs');
const chalk = require('chalk');
const inquirer = require('inquirer');
const openurl2 = require('openurl2');
const stripAnsi = require('strip-ansi');
const Spinner = require('cli-spinner').Spinner;
const Fuse = require('fuse.js');
const {
	getInstalledPath
} = require('get-installed-path');

// Local imports
const options = require('./options.js');

// ***********************************
// ***********************************
let librariesLeftToImport = 0;
const folders = [];
let allBookmarks = [];
let state;

console.log('     _ _                   ');
console.log(' ___| | |__  _ __ ___  ___ ');
console.log('/ __| | |_ \\| \'_  ` _\\/ __|');
console.log('\\__ | | |_) | | | | | \\__ \\');
console.log('|___|_|_.__/|_| |_| |_|___/');
console.log(chalk `{green The simple bookmarks viewer}`);
console.log(chalk `{bgBlue version (1.2.1)}`);
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

				fs.exists(path + '/tags-backup.json', result => {
					if (result == true) {
						const bookmarksWithTagsData = fs.readFileSync(path + '/tags-backup.json', 'utf8');
						if (bookmarksWithTagsData.length > 0) {
							const bookmarksWithTags = JSON.parse(bookmarksWithTagsData);

							for (let i = 0; i < bookmarksWithTags.length; i++) {
								const bookmarkWithTags = bookmarksWithTags[i];

								for (let j = 0; j < allBookmarks.length; j++) {
									const bookmark = allBookmarks[j];

									if (bookmarkWithTags.name == bookmark.name) {
										bookmark.tags = bookmarkWithTags.tags;
									}
								}
							}
						}
					} else {
						// eslint-disable-next-line max-nested-callbacks
						fs.writeFileSync(path + '/tags-backup.json', '', () => {});
					}
				});
			});
		} else if (result == true) {
			const bookmarks = fs.readFileSync(path + '/imported-data.json', 'utf8');
			allBookmarks = JSON.parse(bookmarks);

			const bookmarksWithTagsData = fs.readFileSync(path + '/tags-backup.json', 'utf8');
			if (bookmarksWithTagsData.length > 0) {
				const bookmarksWithTags = JSON.parse(bookmarksWithTagsData);

				for (let i = 0; i < bookmarksWithTags.length; i++) {
					const bookmarkWithTags = bookmarksWithTags[i];

					for (let j = 0; j < allBookmarks.length; j++) {
						const bookmark = allBookmarks[j];

						if (bookmarkWithTags.name == bookmark.name) {
							bookmark.tags = bookmarkWithTags.tags;
						}
					}
				}
			}

			prompt();
		}
	});
});

function queryAnswer(answer) {
	// **** STATES OF BROWSING BOOKMARKS ****
	//
	// -> Bookmarks Browsing
	// -> Tags Operation
	//
	// **************************************

	if (answer.method == 'Group') {
		inquirer.prompt([options.groupByOptions])
			.then(answer => groupQueryBy(answer));
	} else if (answer.method == 'Sort') {
		inquirer.prompt([options.sortByOptions])
			.then(answer => queryBySorting(answer));
	} else if (answer.method == 'Keywords') {
		inquirer.prompt([options.keywordsOptions])
			.then(answer => queryByKeywords(answer));
	} else if (answer.method == 'Tags') {
		inquirer.prompt([options.useTagsOptions])
			.then(answer => selectTagsOperation(answer));
		state = 'Tags Operation';
	} else if (answer.method == 'Settings') {
		inquirer.prompt([options.settingsOptions])
			.then(answer => openOptionsQuery(answer));
	}
}

function selectTagsOperation(answer) {
	const allTags = [];

	for (let i = 0; i < allBookmarks.length; i++) {
		const bookmark = allBookmarks[i];

		for (let j = 0; j < bookmark.tags.length; j++) {
			const tag = bookmark.tags[j];

			if (!allTags.includes(tag)) {
				allTags.push(tag);
			}
		}
	}

	options.browseTagsOptions.choices = allTags;
	options.removeTagsOptions.choices = allTags;

	if (answer.parameter == 'Browse Tags') {
		if (allTags.length == 0) {
			console.log(chalk `{red ✗ You have no tags to browse. Assign tags in order to use this operation.}`);
			prompt();
		} else {
			inquirer.prompt([options.browseTagsOptions])
				.then(answer => displayBookmarksForTags(answer));
		}
	} else if (answer.parameter == 'Assign Tags') {
		inquirer.prompt([options.keywordsOptions])
			.then(answer => queryByKeywords(answer));
	} else if (answer.parameter == 'Remove Tags') {
		if (allTags.length == 0) {
			console.log(chalk `{red ✗ You have no tags to remove. Assign tags in order to use this operation.}`);
			prompt();
		} else {
			inquirer.prompt([options.removeTagsOptions])
				.then(answer => removeTags(answer));
		}
	} else if (answer.parameter == 'Back') {
		prompt();
	}
}

// TODO: When choosing which tags to delete, make sure you
// remove the tags from the bookmarks array of tags as well.
function removeTags(answer) {
	const tagsSelected = answer.parameter;

	for (let i = 0; i < tagsSelected.length; i++) {
		const tag = tagsSelected[i];

		for (let j = 0; j < allBookmarks.length; j++) {
			const bookmark = allBookmarks[j];

			for (let k = 0; k < bookmark.tags.length; k++) {
				if (bookmark.tags[k] == tag) {
					bookmark.tags.splice(k, 1);
				}
			}
		}
	}

	backupTags();
	getInstalledPath('slbms.js').then((path) => {
		fs.writeFile(path + '/imported-data.json', JSON.stringify(allBookmarks), () => {});
	});

	prompt();
}

function displayBookmarksForTags(answer) {
	const bookmarks = [];
	const tagsSelected = answer.parameter;

	for (let i = 0; i < allBookmarks.length; i++) {
		const bookmark = allBookmarks[i];

		for (let j = 0; j < bookmark.tags.length; j++) {
			const tag = bookmark.tags[j];

			if (tagsSelected.includes(tag) && !bookmarks.includes(bookmark.name + ' => ' + bookmark.url)) {
				bookmarks.push(bookmark.name + ' => ' + bookmark.url);
			}
		}
	}

	options.selectedTagsBookmarksOptions.choices = bookmarks;

	inquirer.prompt([options.selectedTagsBookmarksOptions])
		.then(answer => {
			const bookmarkLink = answer.parameter.split(' => ')[1];
			openBookmarkLink(bookmarkLink);
		});
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
		// } else if (answer.parameter == 'Back-up tags') {
		// 	backupTags();
		// 	prompt();
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
	const sortedBookmarks = JSON.parse(JSON.stringify(allBookmarks));

	sortedBookmarks.forEach(bookmark => {
		let date;
		if (bookmark.creationDate !== null && bookmark.creationDate !== undefined) {
			date = bookmark.creationDate;
		} else {
			date = 'No Date';
		}

		const name = bookmark.name;
		const url = bookmark.url;

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

	const spinner = new Spinner(chalk `%s {yellow Searching for matches}`);
	spinner.setSpinnerString('⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏');
	spinner.start();

	const fuseQuery = new Fuse(allBookmarks, options.searchOptions);
	const matches = [];
	fuseQuery.search(answer.keywords).forEach(item => {
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

	const typeOfPrompt = state == 'Tags Operation' ? 'checkbox' : 'list';
	inquirer
		.prompt([{
			type: typeOfPrompt,
			name: 'result',
			message: `Results (${matches.length}):`,
			choices: matches
		}])
		.then(bookmarksPicked => {
			const bookmarksToTag = [];

			if (state == 'Tags Operation') {
				for (let i = 0; i < allBookmarks.length; i++) {
					const bookmark = allBookmarks[i];

					for (let j = 0; j < bookmarksPicked.result.length; j++) {
						const bookmarkPicked = bookmarksPicked.result[j];

						if (bookmark.url == bookmarkPicked.split(' => ')[1]) {
							bookmarksToTag.push(bookmark);
						}
					}
				}

				tagBookmark(bookmarksToTag);
			} else if (state == 'Bookmarks Browsing') {
				pickBookmark(bookmarksPicked);
			}
		});
}

function backupTags() {
	const bookmarksToBackup = [];

	for (let i = 0; i < allBookmarks.length; i++) {
		const bookmark = allBookmarks[i];

		if (bookmark.tags.length > 0) {
			bookmarksToBackup.push(bookmark);

			getInstalledPath('slbms.js').then((path) => {
				fs.writeFile(path + '/tags-backup.json', stripAnsi(JSON.stringify(bookmarksToBackup)), () => {});
			});
		}
	}

	console.log(chalk `{green ✓ Tags backed-up successfully.}`);
}

function tagBookmark(bookmarksToTag) {
	inquirer.prompt([options.assignTagsOptions])
		.then(answer => {
			const tags = answer.keywords.split(' ');
			for (let i = 0; i < bookmarksToTag.length; i++) {
				const bookmarkToTag = bookmarksToTag[i];

				for (let j = 0; j < allBookmarks.length; j++) {
					const bookmark = allBookmarks[j];

					if (bookmark.name == bookmarkToTag.name) {
						bookmark.name = stripAnsi(bookmark.name.split(' => ')[0]);
						bookmark.tags = tags;
					}
				}
			}

			getInstalledPath('slbms.js').then((path) => {
				fs.writeFile(path + '/imported-data.json', JSON.stringify(allBookmarks), () => {});
			});

			console.log(chalk `{green ✓ Tags assigned.}`);
			backupTags();

			prompt();
	});
}

function pickBookmark(bookmarkPicked) {
	const regexForUrls = new RegExp(/(?<Protocol>\w+):\/\/(?<Domain>[\w@][\w.:@]+)\/?[\w.?=%&=\-@/$,]*/);
	const urlResult = regexForUrls.exec(bookmarkPicked.result);

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
	state = 'Bookmarks Browsing';

	inquirer
		.prompt([options.queryMethodOptions])
		.then(answer => queryAnswer(answer));
}

function groupByAddress() {
	const groups = [];
	const allDomains = [];

	for (let i = 0; i < allBookmarks.length; i++) {
		const regexForDomains = new RegExp(/(?<Protocol>\w+):\/\/(?<Domain>[\w@][\w.:@]+)\/?[\w.?=%&=\-@/$,]*/);
		const result = regexForDomains.exec(allBookmarks[i].url);
		if (result !== null && result !== undefined) {
			const domainString = result[2];

			const domainObj = {
				title: allBookmarks[i].name,
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
		const message = `${groups[i].domain} => ${groups[i].count} ${(groups[i].count > 1 ? 'occurrences' : 'occurrence')}`;

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
	const bookmarksFromDomain = [];

	const regexForBookmarks = new RegExp(/(?<Domain>[\w@][\w.:@]+)\/?[\w.?=%&=\-@/$,]*/);
	const result = regexForBookmarks.exec(domain.result);
	const domainString = result[0];

	for (let i = 0; i < allBookmarks.length; i++) {
		const regexForDomainBookmark = new RegExp(domainString);
		const bookmark = regexForDomainBookmark.exec(allBookmarks[i].url);

		if (bookmark !== null && bookmark !== undefined) {
			bookmarksFromDomain.push(allBookmarks[i].name + ' => ' + allBookmarks[i].url);
		}
	}

	const listOfBookmarks = [];
	bookmarksFromDomain.forEach(element => {
		listOfBookmarks.push(element);
	});

	inquirer
		.prompt([{
			type: 'list',
			name: 'result',
			message: `Domain group matches (${listOfBookmarks.length}):`,
			choices: listOfBookmarks
		}])
		.then(bookmark => {
			const bookmarkLink = bookmark.result.split(' => ')[1];
			openBookmarkLink(bookmarkLink);
		});
}

function openBookmarkLink(bookmarkLink) {
	const spinner = new Spinner(chalk `%s {yellow Opening ${bookmarkLink}}`);
	spinner.setSpinnerString('⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏');
	spinner.start();

	openurl2.open(bookmarkLink, () => {
		console.log(chalk `\n{green ✓ Finished opening ${bookmarkLink}}`);
		spinner.stop();

		prompt();
	});
}

function importBookmarks(htmlFile) {
	allBookmarks = [];
	const spinner = new Spinner(chalk `Importing {blue ${htmlFile}} bookmarks file...`);
	spinner.setSpinnerString('⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏');
	spinner.start();

	getInstalledPath('slbms.js').then((path) => {
		bookmarksParser
			.readFromHTMLFile(path + `/bookmarks/${htmlFile}`)
			.then(obj => {
				obj.Bookmarks.children.forEach(bookmarksFolder => {
					getBookmarks(bookmarksFolder);
				});

				fs.existsSync(path + '/tags-backup.json', result => {
					if (result == false) { fs.writeFileSync(path + '/tags-backup.json', '', 'utf8'); }
					else {
						const bookmarksWithTagsData = fs.readFileSync(path + '/tags-backup.json', 'utf8');
						const bookmarksWithTags = JSON.parse(bookmarksWithTagsData);

						for (let i = 0; i < bookmarksWithTags.length; i++) {
							const bookmarkWithTags = bookmarksWithTags[i];

							for (let j = 0; j < allBookmarks.length; j++) {
								const bookmark = allBookmarks[j];

								if (bookmarkWithTags.name == bookmark.name) {
									bookmark.tags = bookmarkWithTags.tags;
								}
							}
						}
					}
				});

				spinner.stop();
				console.log(chalk `Completed Importing {blue ${htmlFile}} bookmarks file`);
				librariesLeftToImport--;

				const bookmarksWithTagsData = fs.readFileSync(path + '/tags-backup.json', 'utf8');
				if (bookmarksWithTagsData.length > 0) {
					const bookmarksWithTags = JSON.parse(bookmarksWithTagsData);

					for (let i = 0; i < bookmarksWithTags.length; i++) {
						const bookmarkWithTags = bookmarksWithTags[i];

						for (let j = 0; j < allBookmarks.length; j++) {
							const bookmark = allBookmarks[j];

							if (bookmarkWithTags.name == bookmark.name) {
								bookmark.tags = bookmarkWithTags.tags;
							}
						}
					}
				}

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
		const bookmarksContainer = {
			name: folder.name,
			bookmarks: []
		};

		folder.children
			.forEach(bookmark => {
				if (bookmark.type == 'folder') {
					getBookmarks(bookmark);
				}

				if (bookmark.type == 'bookmark') {
					const utcSeconds = bookmark.addDate;
					const date = new Date(0);
					date.setUTCSeconds(utcSeconds);

					const newBookmark = {
						name: bookmark.name,
						creationDate: date.toLocaleString(),
						url: bookmark.url,
						fromFolder: bookmarksContainer.name,
						tags: []
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
