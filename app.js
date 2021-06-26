#!/usr/bin/env node
/* eslint-disable no-empty-function */
/* eslint-disable no-shadow */

// Libraries
const bookmarks_parser = require('bookmark-parser');
const fs = require('fs');
const chalk = require('chalk');
const inquirer = require('inquirer');
const openurl2 = require('openurl2');
const strip_ansi = require('strip-ansi');
const Spinner = require('cli-spinner').Spinner;
const Fuse = require('fuse.js');
const {
	getInstalledPath
} = require('get-installed-path');

// Local imports
const options = require('./options.js');
const { group } = require('console');

// ***********************************
// ***********************************
let libraries_left_to_import = 0;
const folders = [];
let all_bookmarks = [];
let state;

console.log('     _ _                   ');
console.log(' ___| | |__  _ __ ___  ___ ');
console.log('/ __| | |_ \\| \'_  ` _\\/ __|');
console.log('\\__ | | |_) | | | | | \\__ \\');
console.log('|___|_|_.__/|_| |_| |_|___/');
console.log(chalk `{bgGreen The simple bookmarks viewer}`);
console.log(chalk `{bgBlue version (1.4)}`);
console.log();

getInstalledPath('slbms.js').then((path) => {
	fs.exists(path + '/local_bookmarks.json', result => {
		if (result == false) {
			fs.exists(path + '/bookmarks', does_folder_exist => {
				if (does_folder_exist == false) {
					throw new Error(chalk `{red Please create a "bookmarks" folder in the root of the package folder (${__dirname}) and add at least one html json bookmarks backup file in it.}`);
				}
			});

			fs.readdir(path + '/bookmarks', (err, files) => {
				if (files == null || files == undefined || files.length == 0) {
					throw new Error(chalk `{red Please add at least one html json bookmarks backup file in the bookmarks folder of the root folder of the package (${__dirname}). Create a bookmarks folder if it does not exist.}`);
				}

				libraries_left_to_import = files.length;
				files.forEach(file => {
					importBookmarks(file);
				});

				fs.exists(path + '/tags.json', result => {
					if (result == true) {
						const bookmarks_with_tags_data = fs.readFileSync(path + '/tags.json', 'utf8');
						if (bookmarks_with_tags_data.length > 0) {
							const bookmarks_with_tags = JSON.parse(bookmarks_with_tags_data);

							for (let i = 0; i < bookmarks_with_tags.length; i++) {
								const bookmark_with_tags = bookmarks_with_tags[i];

								for (let j = 0; j < all_bookmarks.length; j++) {
									const bookmark = all_bookmarks[j];

									if (bookmark_with_tags.name == bookmark.name) {
										bookmark.tags = bookmark_with_tags.tags;
									}
								}
							}
						}
					} else {
						// eslint-disable-next-line max-nested-callbacks
						fs.writeFileSync(path + '/tags.json', '', () => {});
					}
				});
			});
		} else if (result == true) {
			const bookmarks = fs.readFileSync(path + '/local_bookmarks.json', 'utf8');
			all_bookmarks = JSON.parse(bookmarks);

			const bookmarks_with_tags_data = fs.readFileSync(path + '/tags.json', 'utf8');
			if (bookmarks_with_tags_data.length > 0) {
				const bookmarks_with_tags = JSON.parse(bookmarks_with_tags_data);

				for (let i = 0; i < bookmarks_with_tags.length; i++) {
					const bookmark_with_tags = bookmarks_with_tags[i];

					for (let j = 0; j < all_bookmarks.length; j++) {
						const bookmark = all_bookmarks[j];

						if (bookmark_with_tags.name == bookmark.name) {
							bookmark.tags = bookmark_with_tags.tags;
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

	for (let i = 0; i < all_bookmarks.length; i++) {
		const bookmark = all_bookmarks[i];

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
	const tags_selected = answer.parameter;

	for (let i = 0; i < tags_selected.length; i++) {
		const tag = tags_selected[i];

		for (let j = 0; j < all_bookmarks.length; j++) {
			const bookmark = all_bookmarks[j];

			for (let k = 0; k < bookmark.tags.length; k++) {
				if (bookmark.tags[k] == tag) {
					bookmark.tags.splice(k, 1);
				}
			}
		}
	}

	backupTags();
	getInstalledPath('slbms.js').then((path) => {
		fs.writeFile(path + '/local_bookmarks.json', JSON.stringify(all_bookmarks), () => {});
	});

	prompt();
}

function displayBookmarksForTags(answer) {
	const bookmarks = [];
	const tags_selected = answer.parameter;

	for (let i = 0; i < all_bookmarks.length; i++) {
		const bookmark = all_bookmarks[i];

		for (let j = 0; j < bookmark.tags.length; j++) {
			const tag = bookmark.tags[j];

			if (tags_selected.includes(tag) && !bookmarks.includes(bookmark.name)) {
				bookmarks.push(bookmark.name);
			}
		}
	}

	options.selectedTagsBookmarksOptions.choices = bookmarks;

	inquirer.prompt([options.selectedTagsBookmarksOptions])
		.then(answer => {
			for (let i = 0; i < all_bookmarks.length; i++) {
				const bookmark = all_bookmarks[i];

				if (bookmark.name == answer.parameter) {
					openBookmarkLink(bookmark.url);
				}
			}
		});
}

function openOptionsQuery(answer) {
	getInstalledPath('slbms.js').then((path) => {
		if (answer.parameter == 'Re-import bookmarks') {
			fs.readdir(path + '/bookmarks', (err, files) => {
				libraries_left_to_import = files.length;
				files.forEach(file => {
					importBookmarks(file);
				});
			});
		} else if (answer.parameter == 'Remove Duplicates') {
			removeDuplicates();
			prompt();
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
	const sorted_bookmarks = JSON.parse(JSON.stringify(all_bookmarks));

	sorted_bookmarks.forEach(bookmark => {
		let date;
		if (bookmark.creation_date !== null && bookmark.creation_date !== undefined) {
			date = bookmark.creation_date;
		} else {
			date = 'No Date';
		}

		const name = bookmark.name;

		bookmark.name = chalk `${date} => ${name}`;
	});

	if (order == 'Newest') {
		sorted_bookmarks.sort((a, b) => new Date(a.creation_date) > new Date(b.creation_date) ? -1 : 1);
	} else if (order == 'Oldest') {
		sorted_bookmarks.sort((a, b) => new Date(a.creation_date) > new Date(b.creation_date) ? 1 : -1);
	}

	inquirer
		.prompt([{
			type: 'list',
			name: 'result',
			message: chalk `{green ✓ Sorted bookmarks in order of ${
				order == 'Newest' ? 'newest' : 'oldest'}}`,
			choices: sorted_bookmarks
		}])
		.then(answer => {
			const answer_bookmark = answer.result.split(' => ')[1];
			for (let i = 0; i < all_bookmarks.length; i++) {
				const bookmark = all_bookmarks[i];

				if (bookmark.name == answer_bookmark) {
					openBookmarkLink(bookmark.url);
				}
			}
		});
}

function queryByKeywords(answer) {
	if (answer.keywords == '') {
		console.log(chalk `{red ✗ Please give at least one keyword to make a search.}`);
		prompt();
		return;
	}

	const spinner = new Spinner(chalk `%s {yellow Searching for matches}`);
	spinner.setSpinnerString('⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏');
	spinner.start();

	const fuseQuery = new Fuse(all_bookmarks, options.searchOptions);
	const matches = [];
	fuseQuery.search(answer.keywords).forEach(item => {
		item.item.name = chalk `${item.item.name.substring(0, 100)}`;
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
		.then(bookmark_picked => {
			const bookmarks_to_tag = [];

			if (state == 'Tags Operation') {
				for (let i = 0; i < all_bookmarks.length; i++) {
					const bookmark = all_bookmarks[i];

					for (let j = 0; j < bookmark_picked.result.length; j++) {
						const bookmark_picked_result = bookmark_picked.result[j];

						if (bookmark.name == bookmark_picked_result) {
							bookmarks_to_tag.push(bookmark);
						}
					}
				}

				tagBookmark(bookmarks_to_tag);
			} else if (state == 'Bookmarks Browsing') {
				for (let i = 0; i < all_bookmarks.length; i++) {
					const bookmark = all_bookmarks[i];

					if (bookmark.name == bookmark_picked.result) {
						openBookmarkLink(bookmark.url);
					}
				}
			}
		});
}

function removeDuplicates() {
	const bookmark_groups_for_removal = [];
	const bookmark_names_checked = [];

	for (let i = 0; i < all_bookmarks.length; i++) {
		const bookmark_to_check = all_bookmarks[i];
		const matching_bookmarks = {
			latest: '',
			bookmarks: []
		};

		matching_bookmarks.bookmarks.push(bookmark_to_check);

		for (let j = 0; j < all_bookmarks.length; j++) {
			if (bookmark_to_check.name == all_bookmarks[j].name &&
				!bookmark_names_checked.includes(all_bookmarks[j].name) &&
				i != j) {

				matching_bookmarks.bookmarks.push(all_bookmarks[j]);
			}
		}

		bookmark_names_checked.push(bookmark_to_check.name);
		if (matching_bookmarks.bookmarks.length > 1) {
			bookmark_groups_for_removal.push(matching_bookmarks);
		}
	}

	const bookmarks_to_remove = [];
	for (let i = 0; i < bookmark_groups_for_removal.length; i++) {
		const group = bookmark_groups_for_removal[i];

		let latest_in_group = group.bookmarks[0];
		let latest_bookmark_date = new Date(latest_in_group.creation_date);
		for (let j = 0; j < group.bookmarks.length; j++) {
			const bookmark = group.bookmarks[j];
			const group_bookmark_date = new Date(bookmark.creation_date);

			if (group_bookmark_date > latest_bookmark_date) {
				latest_bookmark_date = group_bookmark_date;
				latest_in_group = bookmark;
			}
		}

		group.latest = latest_in_group;
	}

	// The older bookmark should be removed because it could have jumped domains
	// and the new one saved as the latest valid by user.
	for (let i = 0; i < bookmark_groups_for_removal.length; i++) {
		const group = bookmark_groups_for_removal[i];

		for (let j = 0; j < group.bookmarks.length; j++) {
			if (group.latest.creation_date != group.bookmarks[j].creation_date) {
				bookmarks_to_remove.push(group.bookmarks[j]);
			}
		}
	}

	if (bookmarks_to_remove.length == 0) {
		console.log(chalk.yellow('No duplicates to remove were found.'));
		return;
	}

	for (let i = 0; i < bookmarks_to_remove.length; i++) {
		const bookmark_to_remove = bookmarks_to_remove[i];

		for (let j = 0; j < all_bookmarks.length; j++) {
			const bookmark = all_bookmarks[j];

			if (bookmark_to_remove.name == bookmark.name &&
				bookmark_to_remove.creation_date == bookmark.creation_date) {

				all_bookmarks.splice(j, 1);
			}
		}

		console.log(chalk.green(`Duplicate of "${bookmark_to_remove.name}" removed.`));
	}

	getInstalledPath('slbms.js').then((path) => {
		fs.writeFile(path + '/local_bookmarks.json', JSON.stringify(all_bookmarks), () => {});
	});
}

function backupTags() {
	const tagged_bookmarks_to_backup = [];

	for (let i = 0; i < all_bookmarks.length; i++) {
		const bookmark = all_bookmarks[i];

		if (bookmark.tags.length > 0) {
			tagged_bookmarks_to_backup.push(bookmark);

			getInstalledPath('slbms.js').then((path) => {
				fs.writeFile(path + '/tags.json', strip_ansi(JSON.stringify(tagged_bookmarks_to_backup)), () => {});
			});
		}
	}

	console.log(chalk `{green ✓ Tags backed-up successfully.}`);
}

function tagBookmark(bookmarks_to_tag) {
	inquirer.prompt([options.assignTagsOptions])
		.then(answer => {
			const tags = answer.keywords.split(' ');
			for (let i = 0; i < bookmarks_to_tag.length; i++) {
				const bookmark_to_tag = bookmarks_to_tag[i];

				for (let j = 0; j < all_bookmarks.length; j++) {
					const bookmark = all_bookmarks[j];

					if (bookmark.name == bookmark_to_tag.name) {
						bookmark.name = strip_ansi(bookmark.name.split(' => ')[0]);
						bookmark.tags = tags;
					}
				}
			}

			getInstalledPath('slbms.js').then((path) => {
				fs.writeFile(path + '/local_bookmarks.json', JSON.stringify(all_bookmarks), () => {});
			});

			console.log(chalk `{green ✓ Tags assigned.}`);
			backupTags();

			prompt();
		});
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
	const all_domains = [];

	for (let i = 0; i < all_bookmarks.length; i++) {
		const regex_for_domains = new RegExp(/(?<Protocol>\w+):\/\/(?<Domain>[\w@][\w.:@]+)\/?[\w.?=%&=\-@/$,]*/);
		const result = regex_for_domains.exec(all_bookmarks[i].url);
		if (result !== null && result !== undefined) {
			const domain_string = result[2];

			const domainObj = {
				title: all_bookmarks[i].name,
				domain: domain_string,
				count: 1
			};

			let is_domain_in_groups = false;
			for (let j = 0; j < groups.length; j++) {
				if (groups[j].domain == domainObj.domain) {
					groups[j].count++;
					is_domain_in_groups = true;
					break;
				}
			}

			if (is_domain_in_groups == false) {
				groups.push(domainObj);
			}
		}
	}

	groups.sort((a, b) => a.count > b.count ? -1 : 1);

	for (let i = 0; i < groups.length; i++) {
		const message = `${groups[i].domain} => ${groups[i].count} ${(groups[i].count > 1 ? 'occurrences' : 'occurrence')}`;

		all_domains.push(message);
	}

	inquirer
		.prompt([{
			type: 'list',
			name: 'result',
			message: `Results (${groups.length}):`,
			choices: all_domains
		}])
		.then(domain => displayDomainGroup(domain));
}

function displayDomainGroup(domain) {
	const bookmarks_from_domain = [];

	const regex_for_bookmarks = new RegExp(/(?<Domain>[\w@][\w.:@]+)\/?[\w.?=%&=\-@/$,]*/);
	const result = regex_for_bookmarks.exec(domain.result);
	const domain_string = result[0];

	for (let i = 0; i < all_bookmarks.length; i++) {
		const regex_for_domain_bookmark = new RegExp(domain_string);
		const bookmark = regex_for_domain_bookmark.exec(all_bookmarks[i].url);

		if (bookmark !== null && bookmark !== undefined) {
			bookmarks_from_domain.push(all_bookmarks[i].name);
		}
	}

	const list_of_bookmarks = [];
	bookmarks_from_domain.forEach(element => {
		list_of_bookmarks.push(element);
	});

	inquirer
		.prompt([{
			type: 'list',
			name: 'result',
			message: `Domain group matches (${list_of_bookmarks.length}):`,
			choices: list_of_bookmarks
		}])
		.then(answer => {
			for (let i = 0; i < all_bookmarks.length; i++) {
				const bookmark = all_bookmarks[i];

				if (bookmark.name == answer.result) {
					openBookmarkLink(bookmark.url);
				}
			}
		});
}

function openBookmarkLink(bookmark_link) {
	const spinner = new Spinner(chalk `%s {yellow Opening ${bookmark_link}}`);
	spinner.setSpinnerString('⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏');
	spinner.start();

	openurl2.open(bookmark_link, () => {
		console.log(chalk `\n{green ✓ Finished opening ${bookmark_link}}`);
		spinner.stop();

		prompt();
	});
}

function importBookmarks(html_file) {
	all_bookmarks = [];
	const spinner = new Spinner(chalk `Importing {blue ${html_file}} bookmarks file...`);
	spinner.setSpinnerString('⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏');
	spinner.start();

	getInstalledPath('slbms.js').then((path) => {
		bookmarks_parser
			.readFromHTMLFile(path + `/bookmarks/${html_file}`)
			.then(obj => {
				obj.Bookmarks.children.forEach(bookmarks_folder => {
					getBookmarks(bookmarks_folder);
				});

				fs.existsSync(path + '/tags.json', result => {
					if (result == false) { fs.writeFileSync(path + '/tags.json', '', 'utf8'); }
					else {
						const bookmarks_with_tags_data = fs.readFileSync(path + '/tags.json', 'utf8');
						const bookmarks_with_tags = JSON.parse(bookmarks_with_tags_data);

						for (let i = 0; i < bookmarks_with_tags.length; i++) {
							const bookmark_with_tags = bookmarks_with_tags[i];

							for (let j = 0; j < all_bookmarks.length; j++) {
								const bookmark = all_bookmarks[j];

								if (bookmark_with_tags.name == bookmark.name) {
									bookmark.tags = bookmark_with_tags.tags;
								}
							}
						}
					}
				});

				spinner.stop();
				console.log(chalk `Completed Importing {blue ${html_file}} bookmarks file`);
				libraries_left_to_import--;

				const bookmarks_with_tags_data = fs.readFileSync(path + '/tags.json', 'utf8');
				if (bookmarks_with_tags_data.length > 0) {
					const bookmarks_with_tags = JSON.parse(bookmarks_with_tags_data);

					for (let i = 0; i < bookmarks_with_tags.length; i++) {
						const bookmark_with_tags = bookmarks_with_tags[i];

						for (let j = 0; j < all_bookmarks.length; j++) {
							const bookmark = all_bookmarks[j];

							if (bookmark_with_tags.name == bookmark.name) {
								bookmark.tags = bookmark_with_tags.tags;
							}
						}
					}
				}

				if (libraries_left_to_import == 0) {
					fs.writeFile(path + '/local_bookmarks.json', JSON.stringify(all_bookmarks), () => {
						prompt();
					});
				}
			});
	});
}

function getBookmarks(folder) {
	if (Array.isArray(folder.children) && folder.children.length > 0) {
		const bookmarks_container = {
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
						creation_date: date.toLocaleString(),
						url: bookmark.url,
						from_folder: bookmarks_container.name,
						tags: []
					};

					all_bookmarks.push(newBookmark);
					bookmarks_container.bookmarks.push(newBookmark);
				}
			});

		if (bookmarks_container.bookmarks.length > 0) {
			folders.push(bookmarks_container);

			console.log();
			console.log(chalk `Imported library {green ${bookmarks_container.name}} => ${folder.children.length} bookmarks`);
		}
	}
}
